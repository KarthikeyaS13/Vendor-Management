import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../config/db.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';
import { sendTenantWelcomeEmail } from '../utils/mailer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'nexus_admin_secret_key_2026';

// All routes here require Super Admin authentication
router.use(authenticateToken);
router.use(requireSuperAdmin);

/**
 * GET /api/tenants
 * Lists all active and registered tenants with aggregate counts
 */
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    
    // Fetch all non-deleted tenants (or all tenants)
    const tenants = await db.all(`
      SELECT 
        t.*,
        (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id AND u.role != 'SUPER_ADMIN') as users_count,
        (SELECT COUNT(*) FROM vendors v WHERE v.tenant_id = t.id) as vendors_count,
        (SELECT COUNT(*) FROM purchase_orders po WHERE po.tenant_id = t.id) as pos_count,
        (SELECT COUNT(*) FROM purchase_invoices pi WHERE pi.tenant_id = t.id) as invoices_count,
        (SELECT COUNT(*) FROM vendor_applications va WHERE va.tenant_id = t.id) as applications_count,
        (SELECT u.email FROM users u WHERE u.tenant_id = t.id AND u.role = 'TENANT_ADMIN' ORDER BY u.id ASC LIMIT 1) as admin_email,
        (SELECT u.username FROM users u WHERE u.tenant_id = t.id AND u.role = 'TENANT_ADMIN' ORDER BY u.id ASC LIMIT 1) as admin_username
      FROM tenants t
      WHERE t.is_deleted IS NOT TRUE
      ORDER BY t.id ASC
    `);

    const parsedTenants = (tenants || []).map(t => ({
      ...t,
      users_count: parseInt(t.users_count, 10) || 0,
      vendors_count: parseInt(t.vendors_count, 10) || 0,
      pos_count: parseInt(t.pos_count, 10) || 0,
      invoices_count: parseInt(t.invoices_count, 10) || 0,
      applications_count: parseInt(t.applications_count, 10) || 0
    }));

    const totalUsers = parsedTenants.reduce((acc, t) => acc + t.users_count, 0);
    const activeTenants = parsedTenants.filter(t => (t.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length;
    const suspendedTenants = parsedTenants.filter(t => (t.status || '').toUpperCase() === 'SUSPENDED').length;

    res.json({ 
      success: true, 
      tenants: parsedTenants,
      stats: {
        totalTenants: parsedTenants.length,
        activeTenants,
        suspendedTenants,
        totalUsers
      }
    });
  } catch (error) {
    console.error('Error fetching tenants list:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tenants' });
  }
});

/**
 * GET /api/tenants/:id
 * Fetches detailed info, metrics, internal users, settings, and recent audit logs for a tenant
 */
router.get('/:id', async (req, res) => {
  const tenantId = parseInt(req.params.id, 10);
  if (isNaN(tenantId)) {
    return res.status(400).json({ success: false, error: 'Invalid tenant ID' });
  }

  try {
    const db = await getDb();

    // 1. Fetch tenant base details
    const tenant = await db.get(`SELECT * FROM tenants WHERE id = ?`, [tenantId]);
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    // 2. Aggregate statistics
    const rawStats = await db.get(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE tenant_id = ? AND role != 'SUPER_ADMIN') as users_count,
        (SELECT COUNT(*) FROM vendors WHERE tenant_id = ?) as vendors_count,
        (SELECT COUNT(*) FROM vendor_applications WHERE tenant_id = ?) as applications_count,
        (SELECT COUNT(*) FROM purchase_orders WHERE tenant_id = ?) as pos_count,
        (SELECT COUNT(*) FROM purchase_invoices WHERE tenant_id = ?) as invoices_count,
        (SELECT COUNT(*) FROM audit_logs WHERE tenant_id = ?) as audit_logs_count
    `, [tenantId, tenantId, tenantId, tenantId, tenantId, tenantId]);

    const stats = {
      users_count: parseInt(rawStats?.users_count, 10) || 0,
      vendors_count: parseInt(rawStats?.vendors_count, 10) || 0,
      applications_count: parseInt(rawStats?.applications_count, 10) || 0,
      pos_count: parseInt(rawStats?.pos_count, 10) || 0,
      invoices_count: parseInt(rawStats?.invoices_count, 10) || 0,
      audit_logs_count: parseInt(rawStats?.audit_logs_count, 10) || 0
    };

    // 3. Fetch Tenant Users
    const users = await db.all(`
      SELECT id, username, email, role, is_active, created_at, updated_at
      FROM users
      WHERE tenant_id = ?
      ORDER BY id ASC
    `, [tenantId]);

    // 4. Fetch Tenant Settings
    const settingsRows = await db.all(`
      SELECT key, value FROM tenant_settings WHERE tenant_id = ?
    `, [tenantId]);
    
    const settings = {};
    for (const row of settingsRows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }

    // 5. Fetch Recent Audit Logs
    const auditLogs = await db.all(`
      SELECT id, action, details, entity_type, entity_id, created_at
      FROM audit_logs
      WHERE tenant_id = ?
      ORDER BY created_at DESC
      LIMIT 15
    `, [tenantId]);

    res.json({
      success: true,
      tenant,
      stats: {
        users: stats?.users_count || 0,
        vendors: stats?.vendors_count || 0,
        applications: stats?.applications_count || 0,
        purchaseOrders: stats?.pos_count || 0,
        invoices: stats?.invoices_count || 0,
        auditLogs: stats?.audit_logs_count || 0
      },
      users: users || [],
      settings,
      auditLogs: auditLogs || []
    });
  } catch (error) {
    console.error(`Error fetching tenant ${tenantId} details:`, error);
    res.status(500).json({ success: false, error: 'Failed to fetch tenant details' });
  }
});

/**
 * POST /api/tenants
 * One-Click Provisioning for a new tenant
 */
router.post('/', async (req, res) => {
  const {
    companyName,
    companyCode,
    email,
    phone,
    gstNumber,
    address,
    country = 'India',
    timezone = 'Asia/Kolkata',
    currency = 'INR',
    subscriptionPlan = 'Starter',
    licenseCount = 10,
    storageLimit = 5,
    expiryDate,
    adminFullName,
    adminUsername,
    adminEmail,
    adminPassword
  } = req.body;

  // Validation
  if (!companyName || !companyCode || !adminUsername || !adminEmail || !adminPassword) {
    return res.status(400).json({
      success: false,
      error: 'Company Name, Company Code, Admin Username, Admin Email, and Admin Password are required'
    });
  }

  const cleanCode = companyCode.trim().toUpperCase();
  const cleanUsername = adminUsername.trim();
  const cleanEmail = adminEmail.trim();

  try {
    const db = await getDb();

    // Check company code uniqueness
    const existingCode = await db.get(`SELECT id FROM tenants WHERE UPPER(company_code) = ?`, [cleanCode]);
    if (existingCode) {
      return res.status(400).json({ success: false, error: `Company Code "${cleanCode}" is already taken.` });
    }

    // Check user uniqueness
    const existingUser = await db.get(
      `SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)`,
      [cleanUsername, cleanEmail]
    );
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Admin username or email is already registered.' });
    }

    // STEP 1: Create Tenant
    const tenantResult = await db.run(`
      INSERT INTO tenants (
        company_name, company_code, email, phone, gst_number, address,
        country, timezone, currency, subscription_plan, subscription_status,
        license_count, storage_limit, expiry_date, status, is_deleted, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, 'ACTIVE', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      companyName.trim(),
      cleanCode,
      email ? email.trim() : cleanEmail,
      phone ? phone.trim() : null,
      gstNumber ? gstNumber.trim() : null,
      address ? address.trim() : null,
      country,
      timezone,
      currency,
      subscriptionPlan,
      parseInt(licenseCount, 10) || 10,
      parseInt(storageLimit, 10) || 5,
      expiryDate || null
    ]);

    let newTenant = tenantResult;
    if (!newTenant || !newTenant.id) {
      newTenant = await db.get(`SELECT * FROM tenants WHERE company_code = ?`, [cleanCode]);
    }

    const tenantId = newTenant.id;

    // STEP 2: Create Tenant Admin User
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const userResult = await db.run(`
      INSERT INTO users (
        username, email, password_hash, role, tenant_id, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, 'TENANT_ADMIN', ?, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, username, email, role
    `, [cleanUsername, cleanEmail, passwordHash, tenantId]);

    const adminUser = userResult || { username: cleanUsername, email: cleanEmail, role: 'TENANT_ADMIN' };

    // STEP 3: Seed Default Tenant Settings
    const defaultSettings = [
      {
        key: 'po_config',
        value: JSON.stringify({ prefix: 'PO', nextNumber: 1, padding: 4 })
      },
      {
        key: 'inv_config',
        value: JSON.stringify({ prefix: 'INV', nextNumber: 1, padding: 4 })
      },
      {
        key: 'vendor_config',
        value: JSON.stringify({ prefix: 'VEN', nextNumber: 1, padding: 3 })
      },
      {
        key: 'company_settings',
        value: JSON.stringify({
          companyName: companyName.trim(),
          companyCode: cleanCode,
          currency,
          timezone,
          dateFormat: 'DD/MM/YYYY'
        })
      }
    ];

    for (const item of defaultSettings) {
      await db.run(`
        INSERT INTO tenant_settings (tenant_id, key, value)
        VALUES (?, ?, ?)
        ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value
      `, [tenantId, item.key, item.value]);
    }

    // STEP 4: Create Isolated Upload Directories
    const uploadBase = path.join(__dirname, '../../../uploads', String(tenantId));
    const subdirs = ['vendors', 'documents', 'logos', 'invoices'];
    for (const subdir of subdirs) {
      try {
        fs.mkdirSync(path.join(uploadBase, subdir), { recursive: true });
      } catch (dirErr) {
        console.warn(`[Tenant Provisioning] Directory creation warning for ${subdir}:`, dirErr.message);
      }
    }

    // STEP 5: Send Welcome Email
    const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const loginUrl = `${appUrl}/login`;
    sendTenantWelcomeEmail({
      to: cleanEmail,
      companyName: companyName.trim(),
      companyCode: cleanCode,
      username: cleanUsername,
      password: adminPassword,
      loginUrl
    }).catch(err => console.error('[Tenant Provisioning] Welcome email send error:', err.message));

    // STEP 6: Log Audit Entry
    try {
      await db.run(`
        INSERT INTO audit_logs (action, details, entity_type, entity_id, tenant_id, user_id, created_at)
        VALUES ('TENANT_CREATE', ?, 'TENANT', ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        `Tenant "${companyName.trim()}" (${cleanCode}) provisioned with plan ${subscriptionPlan} by Super Admin`,
        tenantId,
        tenantId,
        req.user.id || null
      ]);
    } catch (auditErr) {
      console.warn('[Tenant Provisioning] Audit log warning:', auditErr.message);
    }

    res.status(201).json({
      success: true,
      message: `Tenant "${companyName}" provisioned successfully.`,
      tenant: newTenant,
      admin: adminUser
    });
  } catch (error) {
    console.error('Tenant provisioning error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to provision tenant' });
  }
});

/**
 * PATCH /api/tenants/:id
 * Update tenant profile and subscription configuration
 */
router.patch('/:id', async (req, res) => {
  const tenantId = parseInt(req.params.id, 10);
  if (isNaN(tenantId)) {
    return res.status(400).json({ success: false, error: 'Invalid tenant ID' });
  }

  const {
    companyName,
    email,
    phone,
    gstNumber,
    address,
    country,
    timezone,
    currency,
    subscriptionPlan,
    licenseCount,
    storageLimit,
    expiryDate
  } = req.body;

  try {
    const db = await getDb();
    
    const existing = await db.get(`SELECT * FROM tenants WHERE id = ?`, [tenantId]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    await db.run(`
      UPDATE tenants SET
        company_name = COALESCE(?, company_name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        gst_number = COALESCE(?, gst_number),
        address = COALESCE(?, address),
        country = COALESCE(?, country),
        timezone = COALESCE(?, timezone),
        currency = COALESCE(?, currency),
        subscription_plan = COALESCE(?, subscription_plan),
        license_count = COALESCE(?, license_count),
        storage_limit = COALESCE(?, storage_limit),
        expiry_date = COALESCE(?, expiry_date),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      companyName || null,
      email || null,
      phone || null,
      gstNumber || null,
      address || null,
      country || null,
      timezone || null,
      currency || null,
      subscriptionPlan || null,
      licenseCount !== undefined ? parseInt(licenseCount, 10) : null,
      storageLimit !== undefined ? parseInt(storageLimit, 10) : null,
      expiryDate || null,
      tenantId
    ]);

    const updated = await db.get(`SELECT * FROM tenants WHERE id = ?`, [tenantId]);

    // Audit update
    await db.run(`
      INSERT INTO audit_logs (action, details, entity_type, entity_id, tenant_id, user_id, created_at)
      VALUES ('TENANT_UPDATE', ?, 'TENANT', ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      `Tenant "${updated.company_name}" details updated by Super Admin`,
      tenantId,
      tenantId,
      req.user.id || null
    ]);

    res.json({ success: true, tenant: updated });
  } catch (error) {
    console.error(`Error updating tenant ${tenantId}:`, error);
    res.status(500).json({ success: false, error: 'Failed to update tenant' });
  }
});

/**
 * PATCH /api/tenants/:id/status
 * Activate or Suspend a tenant
 */
router.patch('/:id/status', async (req, res) => {
  const tenantId = parseInt(req.params.id, 10);
  const rawStatus = req.body.status;
  const status = (rawStatus || '').toUpperCase();

  if (isNaN(tenantId) || !['ACTIVE', 'SUSPENDED'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status. Must be ACTIVE or SUSPENDED.' });
  }

  try {
    const db = await getDb();
    const tenant = await db.get(`SELECT * FROM tenants WHERE id = ?`, [tenantId]);
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    await db.run(`
      UPDATE tenants SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [status, tenantId]);

    // Also update tenant's users active state if suspended
    if (status === 'SUSPENDED') {
      await db.run(`UPDATE users SET is_active = false WHERE tenant_id = ? AND role != 'SUPER_ADMIN'`, [tenantId]);
    } else if (status === 'ACTIVE') {
      // Re-enable tenant admin
      await db.run(`UPDATE users SET is_active = true WHERE tenant_id = ? AND role = 'TENANT_ADMIN'`, [tenantId]);
    }

    try {
      await db.run(`
        INSERT INTO audit_logs (action, details, entity_type, entity_id, tenant_id, user_id, created_at)
        VALUES ('TENANT_STATUS_CHANGE', ?, 'TENANT', ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        `Tenant "${tenant.company_name}" status changed to ${status} by Super Admin`,
        tenantId,
        tenantId,
        req.user.id || null
      ]);
    } catch (auditErr) {
      console.warn('[Audit Warning] Status change audit failed:', auditErr.message);
    }

    res.json({ success: true, message: `Tenant status updated to ${status}`, status });
  } catch (error) {
    console.error('Error changing tenant status:', error);
    res.status(500).json({ success: false, error: 'Failed to update tenant status' });
  }
});

/**
 * POST /api/tenants/:id/reset-admin-password
 * Reset primary admin password for a tenant
 */
router.post('/:id/reset-admin-password', async (req, res) => {
  const tenantId = parseInt(req.params.id, 10);
  const { newPassword } = req.body;

  if (isNaN(tenantId) || !newPassword || newPassword.length < 4) {
    return res.status(400).json({ success: false, error: 'Valid new password is required (minimum 4 characters).' });
  }

  try {
    const db = await getDb();
    let adminUser = await db.get(
      `SELECT * FROM users WHERE tenant_id = ? AND role = 'TENANT_ADMIN' ORDER BY id ASC LIMIT 1`,
      [tenantId]
    );

    if (!adminUser) {
      // Check if any user exists for this tenant
      adminUser = await db.get(
        `SELECT * FROM users WHERE tenant_id = ? ORDER BY id ASC LIMIT 1`,
        [tenantId]
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    if (!adminUser) {
      const tenant = await db.get(`SELECT * FROM tenants WHERE id = ?`, [tenantId]);
      const defaultUsername = `admin_${(tenant?.company_code || 'tenant').toLowerCase()}`;
      const defaultEmail = tenant?.email || `admin@${(tenant?.company_code || 'company').toLowerCase()}.com`;
      await db.run(`
        INSERT INTO users (username, email, password_hash, role, tenant_id, is_active, created_at, updated_at)
        VALUES (?, ?, ?, 'TENANT_ADMIN', ?, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [defaultUsername, defaultEmail, passwordHash, tenantId]);
      return res.json({ success: true, message: `Admin user provisioned with new password successfully.` });
    }

    await db.run(`UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [passwordHash, adminUser.id]);

    try {
      await db.run(`
        INSERT INTO audit_logs (action, details, entity_type, entity_id, tenant_id, user_id, created_at)
        VALUES ('ADMIN_PASSWORD_RESET', ?, 'USER', ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        `Password for Tenant Admin "${adminUser.username}" reset by Super Admin`,
        adminUser.id,
        tenantId,
        req.user.id || null
      ]);
    } catch (auditErr) {
      console.warn('[Audit Warning] Password reset audit failed:', auditErr.message);
    }

    res.json({ success: true, message: `Admin password for "${adminUser.username}" has been successfully reset.` });
  } catch (error) {
    console.error('Error resetting tenant admin password:', error);
    res.status(500).json({ success: false, error: 'Failed to reset admin password' });
  }
});

/**
 * POST /api/tenants/:id/impersonate
 * Super Admin temporarily logs in as Tenant Administrator to troubleshoot customer issues
 */
router.post('/:id/impersonate', async (req, res) => {
  const tenantId = parseInt(req.params.id, 10);
  if (isNaN(tenantId)) {
    return res.status(400).json({ success: false, error: 'Invalid tenant ID' });
  }

  try {
    const db = await getDb();
    
    // Fetch tenant
    const tenant = await db.get(`SELECT * FROM tenants WHERE id = ?`, [tenantId]);
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    const tenantStatus = (tenant.status || 'ACTIVE').toUpperCase();
    if (tenantStatus === 'SUSPENDED') {
      return res.status(400).json({ success: false, error: 'Cannot impersonate a suspended tenant. Please reactivate tenant first.' });
    }

    // Fetch primary admin user
    let adminUser = await db.get(
      `SELECT * FROM users WHERE tenant_id = ? AND role = 'TENANT_ADMIN' ORDER BY id ASC LIMIT 1`,
      [tenantId]
    );

    // If no TENANT_ADMIN user found, fallback to any active user for that tenant
    if (!adminUser) {
      adminUser = await db.get(
        `SELECT * FROM users WHERE tenant_id = ? AND is_active = true ORDER BY id ASC LIMIT 1`,
        [tenantId]
      );
    }

    // If still no user exists for this tenant, auto-provision a Tenant Administrator
    if (!adminUser) {
      const codeClean = (tenant.company_code || `T${tenant.id}`).toLowerCase();
      const defaultUsername = `admin_${codeClean}`;
      const defaultEmail = tenant.email || `admin@${codeClean}.local`;
      const passwordHash = await bcrypt.hash('Admin@123', 10);

      try {
        const insertRes = await db.run(`
          INSERT INTO users (username, email, password_hash, role, tenant_id, is_active, created_at, updated_at)
          VALUES (?, ?, ?, 'TENANT_ADMIN', ?, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id, username, email, role
        `, [defaultUsername, defaultEmail, passwordHash, tenantId]);
        
        adminUser = insertRes || await db.get(`SELECT * FROM users WHERE tenant_id = ? ORDER BY id DESC LIMIT 1`, [tenantId]);
      } catch (createErr) {
        console.warn('[Impersonation] Admin creation fallback:', createErr.message);
        adminUser = {
          id: 9999 + tenantId,
          username: defaultUsername,
          email: defaultEmail,
          role: 'TENANT_ADMIN',
          tenant_id: tenantId
        };
      }
    }

    // Generate impersonation token
    const tokenPayload = {
      userId: adminUser.id,
      tenantId: tenant.id,
      role: adminUser.role || 'TENANT_ADMIN',
      email: adminUser.email,
      username: adminUser.username,
      companyName: tenant.company_name,
      companyCode: tenant.company_code,
      isImpersonated: true,
      impersonatedBy: req.user.id || req.user.userId,
      impersonatedByEmail: req.user.email
    };

    const impersonationToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '2h' });

    // Audit the impersonation action
    try {
      await db.run(`
        INSERT INTO audit_logs (action, details, entity_type, entity_id, tenant_id, user_id, created_at)
        VALUES ('SUPER_ADMIN_IMPERSONATION', ?, 'TENANT', ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        `Super Admin "${req.user.email}" impersonated Tenant Admin "${adminUser.username}" for ${tenant.company_name}`,
        tenant.id,
        tenant.id,
        req.user.id || null
      ]);
    } catch (auditErr) {
      console.warn('[Audit Warning] Impersonation audit failed:', auditErr.message);
    }

    res.json({
      success: true,
      message: `Now impersonating ${tenant.company_name}`,
      token: impersonationToken,
      user: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role || 'TENANT_ADMIN',
        tenantId: tenant.id,
        companyName: tenant.company_name,
        companyCode: tenant.company_code,
        isImpersonated: true,
        impersonatedByEmail: req.user.email
      }
    });
  } catch (error) {
    console.error('Error generating impersonation session:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate impersonation' });
  }
});

/**
 * DELETE /api/tenants/:id
 * Soft delete tenant
 */
router.delete('/:id', async (req, res) => {
  const tenantId = parseInt(req.params.id, 10);
  if (isNaN(tenantId)) {
    return res.status(400).json({ success: false, error: 'Invalid tenant ID' });
  }

  try {
    const db = await getDb();
    const tenant = await db.get(`SELECT * FROM tenants WHERE id = ?`, [tenantId]);
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    await db.run(`
      UPDATE tenants SET 
        is_deleted = true, 
        status = 'SUSPENDED',
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [tenantId]);

    // Deactivate users
    await db.run(`UPDATE users SET is_active = false WHERE tenant_id = ? AND role != 'SUPER_ADMIN'`, [tenantId]);

    // Audit log
    await db.run(`
      INSERT INTO audit_logs (action, details, entity_type, entity_id, tenant_id, user_id, created_at)
      VALUES ('TENANT_DELETE', ?, 'TENANT', ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      `Tenant "${tenant.company_name}" (${tenant.company_code}) soft-deleted by Super Admin`,
      tenantId,
      tenantId,
      req.user.id || null
    ]);

    res.json({ success: true, message: `Tenant "${tenant.company_name}" deleted.` });
  } catch (error) {
    console.error('Error soft-deleting tenant:', error);
    res.status(500).json({ success: false, error: 'Failed to delete tenant' });
  }
});

export default router;

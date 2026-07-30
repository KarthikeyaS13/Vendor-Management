import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { getDb } from '../config/db.js';
import { normalizeRole, getRedirectPath } from '../config/roles.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'nexus_admin_secret_key_2026';

// Helper to generate JWT to keep code clean
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const db = await getDb();

    // 1. Find user (check vendor_users first, then users)
    let userRecord = await db.get(
      `SELECT vu.*, t.status as tenant_status, 'vendor' as user_type 
       FROM vendor_users vu 
       LEFT JOIN tenants t ON vu.tenant_id = t.id 
       WHERE vu.email = ?`,
      [username]
    );

    if (!userRecord) {
      userRecord = await db.get(
        `SELECT u.*, t.status as tenant_status, 'internal' as user_type 
         FROM users u 
         LEFT JOIN tenants t ON u.tenant_id = t.id 
         WHERE u.username = ? OR u.email = ?`,
        [username, username]
      );
    }

    if (!userRecord) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // 2. Verify password
    const passwordMatch = await bcrypt.compare(password, userRecord.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // 3. Check active status
    if (!userRecord.is_active) {
      return res.status(401).json({ success: false, error: 'Account is deactivated' });
    }

    // 4. Normalize role
    const finalRole = normalizeRole(userRecord.role);

    // 5. Check tenant status (Skip for SUPER_ADMIN)
    if (finalRole !== 'SUPER_ADMIN') {
      if (!userRecord.tenant_status) {
        return res.status(401).json({ success: false, error: 'Missing tenant' });
      }
      if (userRecord.tenant_status !== 'ACTIVE') {
        return res.status(401).json({ success: false, error: 'Tenant is inactive' });
      }
    }

    // 6. Handle vendor-specific password change requirement
    if (userRecord.user_type === 'vendor' && userRecord.must_change_password) {
      return res.json({
        success: true,
        requiresPasswordChange: true,
        email: userRecord.email,
        tenantId: userRecord.tenant_id
      });
    }

    // 7. Generate JWT payload
    const tokenPayload = {
      userId: userRecord.id,
      tenantId: userRecord.tenant_id,
      vendorId: userRecord.vendor_id,
      email: userRecord.email,
      role: finalRole,
      ...(userRecord.user_type === 'internal' && { username: userRecord.username })
    };

    const token = generateToken(tokenPayload);

    // 8. Determine redirect and return response
    return res.json({
      success: true,
      token,
      redirect: getRedirectPath(finalRole),
      user: {
        id: userRecord.id,
        tenantId: userRecord.tenant_id,
        vendorId: userRecord.vendor_id,
        email: userRecord.email,
        role: finalRole,
        ...(userRecord.user_type === 'internal' && { username: userRecord.username })
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Change Password Endpoint (kept mostly intact but uses new role config)
router.post('/vendor/change-password', async (req, res) => {
  const { email, tempPassword, newPassword } = req.body;
  
  if (!email || !tempPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    const db = await getDb();
    const vendorUser = await db.get(
      'SELECT vu.*, t.status as tenant_status FROM vendor_users vu JOIN tenants t ON vu.tenant_id = t.id WHERE vu.email = ?', 
      [email]
    );
    
    if (!vendorUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (!vendorUser.is_active) {
      return res.status(401).json({ success: false, error: 'Account is deactivated' });
    }

    const finalRole = normalizeRole(vendorUser.role);
    
    if (finalRole !== 'SUPER_ADMIN') {
      if (!vendorUser.tenant_status) {
        return res.status(401).json({ success: false, error: 'Missing tenant' });
      }
      if (vendorUser.tenant_status !== 'ACTIVE') {
        return res.status(401).json({ success: false, error: 'Tenant is inactive' });
      }
    }

    const passwordMatch = await bcrypt.compare(tempPassword, vendorUser.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Invalid temporary password' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    await db.run(
      'UPDATE vendor_users SET password_hash = ?, must_change_password = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, vendorUser.id]
    );

    const tokenPayload = {
      userId: vendorUser.id,
      tenantId: vendorUser.tenant_id,
      vendorId: vendorUser.vendor_id,
      email: vendorUser.email,
      role: finalRole
    };

    const token = generateToken(tokenPayload);

    return res.json({
      success: true,
      token,
      redirect: getRedirectPath(finalRole),
      user: {
        id: vendorUser.id,
        tenantId: vendorUser.tenant_id,
        vendorId: vendorUser.vendor_id,
        email: vendorUser.email,
        role: finalRole
      }
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;

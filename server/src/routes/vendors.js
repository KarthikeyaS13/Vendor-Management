import express from 'express';
import { getDb } from '../config/db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import { sendVendorProfileUpdateEmail, sendVendorCredentialsEmail } from '../utils/mailer.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/permissions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ storage: storage })

const router = express.Router();

// POST /api/vendors/upload
// Handle document uploads during registration
router.post('/upload', upload.array('documents'), async (req, res) => {
  try {
    const { applicationId, documentTypes } = req.body;
    const files = req.files;
    const db = await getDb();

    if (!applicationId || !files || files.length === 0) {
      return res.status(400).json({ error: 'Missing applicationId or documents.' });
    }

    const application = await db.get('SELECT tenant_id FROM vendor_applications WHERE id = ?', [applicationId]);
    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }
    const tenantId = application.tenant_id;

    let docTypesArray = [];
    if (Array.isArray(documentTypes)) {
      docTypesArray = documentTypes;
    } else {
      docTypesArray = [documentTypes];
    }

    // Insert document_types if they don't exist
    for (const type of docTypesArray) {
      const existingType = await db.get('SELECT id FROM document_types WHERE name = ?', [type]);
      if (!existingType) {
        await db.run('INSERT INTO document_types (name) VALUES (?)', [type]);
      }
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const type = docTypesArray[i];
      
      const docType = await db.get('SELECT id FROM document_types WHERE name = ?', [type]);
      
      await db.run(
        'INSERT INTO vendor_documents (tenant_id, application_id, document_type_id, file_name, file_path, file_size, mime_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [tenantId, applicationId, docType.id, file.originalname, '/uploads/' + file.filename, file.size, file.mimetype]
      );
    }
    
    res.json({ success: true, message: 'Documents uploaded successfully.' });
  } catch (err) {
    console.error('Error uploading documents:', err);
    res.status(500).json({ error: 'Failed to upload documents.' });
  }
});

// GET /api/vendors
// Fetch all vendor master records
router.get('/', authenticateToken, authorize(PERMISSIONS.VENDOR_VIEW), async (req, res) => {
  try {
    const db = await getDb();
    const vendors = await db.all(`
      SELECT 
        v.id,
        v.vendor_code,
        v.company_name,
        v.contact_person,
        v.email,
        v.mobile,
        v.industry,
        v.status,
        v.gst_number,
        v.pan_number,
        v.registration_date,
        vcp.address,
        vcp.city,
        vcp.state
      FROM vendors v
      LEFT JOIN vendor_company_profiles vcp ON v.application_id = vcp.application_id
      WHERE v.tenant_id = ?
      ORDER BY v.created_at DESC
    `, [req.user.tenantId]);
    
    res.json(vendors);
  } catch (err) {
    console.error('Error fetching vendors:', err);
    res.status(500).json({ error: 'Failed to fetch vendors.' });
  }
});

// GET /api/vendors/:id
// Get comprehensive vendor details
router.get('/:id', authenticateToken, authorize(PERMISSIONS.VENDOR_VIEW), async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    
    const vendor = await db.get('SELECT * FROM vendors WHERE id = ? AND tenant_id = ?', [id, req.user.tenantId]);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    
    // Fetch associated application profiles using application_id
    const appId = vendor.application_id;
    
    const company = await db.get('SELECT * FROM vendor_company_profiles WHERE application_id = ? AND tenant_id = ?', [appId, req.user.tenantId]);
    const business = await db.get('SELECT * FROM vendor_business_profiles WHERE application_id = ? AND tenant_id = ?', [appId, req.user.tenantId]);
    const financial = await db.get('SELECT * FROM vendor_financial_profiles WHERE application_id = ? AND tenant_id = ?', [appId, req.user.tenantId]);
    const contacts = await db.all('SELECT * FROM vendor_contacts WHERE application_id = ? AND tenant_id = ?', [appId, req.user.tenantId]);
    const documents = await db.all(`
      SELECT d.*, dt.name as document_type_name
      FROM vendor_documents d
      JOIN document_types dt ON d.document_type_id = dt.id
      WHERE d.application_id = ? AND d.tenant_id = ?
    `, [appId, req.user.tenantId]);
    
    // Fetch audit timeline (status changes)
    const auditLogs = await db.all(`
      SELECT action, new_values, created_at 
      FROM audit_logs 
      WHERE entity_type = 'VENDOR' AND entity_id = ? AND tenant_id = ?
      ORDER BY created_at DESC
    `, [appId, req.user.tenantId]); // we linked it to appId in the creation step

    res.json({
      vendor,
      company,
      business,
      financial,
      contacts,
      documents,
      auditLogs
    });
  } catch (err) {
    console.error('Error fetching vendor details:', err);
    res.status(500).json({ error: 'Failed to fetch vendor details.' });
  }
});

// PUT /api/vendors/:id
// Update vendor profile details (Company Info & Contact Info)
router.put('/:id', authenticateToken, authorize(PERMISSIONS.VENDOR_EDIT), async (req, res) => {
  const { id } = req.params;
  const {
    company_name,
    trade_name,
    entity_type,
    address,
    city,
    state,
    contact_person,
    email,
    mobile
  } = req.body;

  try {
    const db = await getDb();

    // Ensure vendor exists and belongs to tenant
    const vendor = await db.get('SELECT * FROM vendors WHERE id = ? AND tenant_id = ?', [id, req.user.tenantId]);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    const newCompanyName = company_name !== undefined ? company_name : vendor.company_name;
    const newContactPerson = contact_person !== undefined ? contact_person : vendor.contact_person;
    const newEmail = email !== undefined ? email : vendor.email;
    const newMobile = mobile !== undefined ? mobile : vendor.mobile;

    // 1. Update vendors table
    await db.run(`
      UPDATE vendors 
      SET company_name = ?, contact_person = ?, email = ?, mobile = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `, [newCompanyName, newContactPerson, newEmail, newMobile, id, req.user.tenantId]);

    // 2. Update vendor_company_profiles table if exists (by application_id)
    if (vendor.application_id) {
      const existingProfile = await db.get('SELECT id FROM vendor_company_profiles WHERE application_id = ? AND tenant_id = ?', [vendor.application_id, req.user.tenantId]);
      if (existingProfile) {
        await db.run(`
          UPDATE vendor_company_profiles
          SET legal_name = ?, trade_name = ?, entity_type = ?, address = ?, city = ?, state = ?, contact_person = ?, email = ?
          WHERE application_id = ? AND tenant_id = ?
        `, [
          newCompanyName,
          trade_name !== undefined ? trade_name : '',
          entity_type !== undefined ? entity_type : '',
          address !== undefined ? address : '',
          city !== undefined ? city : '',
          state !== undefined ? state : '',
          newContactPerson,
          newEmail,
          vendor.application_id,
          req.user.tenantId
        ]);
      } else {
        await db.run(`
          INSERT INTO vendor_company_profiles (tenant_id, application_id, legal_name, trade_name, entity_type, address, city, state, contact_person, email)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          req.user.tenantId,
          vendor.application_id,
          newCompanyName,
          trade_name !== undefined ? trade_name : '',
          entity_type !== undefined ? entity_type : '',
          address !== undefined ? address : '',
          city !== undefined ? city : '',
          state !== undefined ? state : '',
          newContactPerson,
          newEmail
        ]);
      }

      // Update primary vendor contact if exists
      try {
        await db.run(`
          UPDATE vendor_contacts
          SET first_name = ?, email = ?, phone = ?
          WHERE application_id = ? AND tenant_id = ? AND (is_primary = 1 OR is_primary = 'true')
        `, [newContactPerson, newEmail, newMobile, vendor.application_id, req.user.tenantId]);
      } catch (contactErr) {
        console.warn('Could not update vendor_contacts:', contactErr.message);
      }
    }

    // 3. Update vendor_users table so login credentials match the new email & contact name
    try {
      await db.run(`
        UPDATE vendor_users
        SET email = ?, full_name = ?
        WHERE vendor_id = ? AND tenant_id = ?
      `, [newEmail, newContactPerson, id, req.user.tenantId]);
    } catch (userErr) {
      console.warn('Could not update vendor_users:', userErr.message);
    }

    // 4. Record audit log
    try {
      await db.run(`
        INSERT INTO audit_logs (tenant_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        req.user.tenantId,
        'VENDOR_INFO_UPDATED',
        'VENDOR',
        vendor.application_id || String(id),
        JSON.stringify({
          company_name: vendor.company_name,
          contact_person: vendor.contact_person,
          email: vendor.email,
          mobile: vendor.mobile
        }),
        JSON.stringify({
          company_name: newCompanyName,
          contact_person: newContactPerson,
          email: newEmail,
          mobile: newMobile
        })
      ]);
    } catch (auditErr) {
      console.warn('Could not insert audit_log:', auditErr.message);
    }

    // 5. Send email notification to updated email (and old email if modified)
    sendVendorProfileUpdateEmail({
      to: newEmail,
      vendorName: newCompanyName,
      contactPerson: newContactPerson,
      oldEmail: vendor.email
    }).catch(err => console.error('[Email Error] Failed sending profile update email:', err));

    res.json({ success: true, message: 'Vendor information updated successfully' });
  } catch (err) {
    console.error('Error updating vendor details:', err);
    res.status(500).json({ error: 'Failed to update vendor information.' });
  }
});

// PATCH /api/vendors/:id/status
// Update vendor status
router.patch('/:id/status', authenticateToken, authorize(PERMISSIONS.VENDOR_EDIT), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'Active', 'Inactive', 'Suspended', 'Blacklisted'

  const validStatuses = ['Active', 'Inactive', 'Suspended', 'Blacklisted'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const db = await getDb();
    
    const vendor = await db.get('SELECT * FROM vendors WHERE id = ? AND tenant_id = ?', [id, req.user.tenantId]);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    await db.run(
      'UPDATE vendors SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?',
      [status, id, req.user.tenantId]
    );

    // Audit log
    await db.run(`
      INSERT INTO audit_logs (tenant_id, action, entity_type, entity_id, old_values, new_values)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      req.user.tenantId,
      `VENDOR_STATUS_UPDATED_TO_${status.toUpperCase()}`,
      'VENDOR',
      vendor.application_id,
      JSON.stringify({ status: vendor.status }),
      JSON.stringify({ status: status })
    ]);

    res.json({ success: true, message: `Vendor status updated to ${status}` });
  } catch (err) {
    console.error('Error updating vendor status:', err);
    res.status(500).json({ error: 'Failed to update vendor status.' });
  }
});

// POST /api/vendors/:id/credentials
// Create login credentials for a vendor
router.post('/:id/credentials', authenticateToken, authorize(PERMISSIONS.VENDOR_EDIT), async (req, res) => {
  const { id } = req.params;
  const { email, password, fullName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const db = await getDb();
    
    // Ensure vendor exists and belongs to tenant
    const vendor = await db.get('SELECT id, contact_person, company_name FROM vendors WHERE id = ? AND tenant_id = ?', [id, req.user.tenantId]);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    
    // Check if email already exists in vendor_users table for THIS tenant
    const existingUser = await db.get('SELECT id FROM vendor_users WHERE email = ? AND tenant_id = ?', [email, req.user.tenantId]);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already in use for a vendor account within this tenant' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await db.run(
      'INSERT INTO vendor_users (tenant_id, vendor_id, full_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.tenantId, id, fullName || vendor.contact_person || 'Vendor Contact', email, passwordHash, 'VENDOR']
    );

    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const portalUrl = process.env.FRONTEND_URL || `${protocol}://${host}/portal-login`;

    sendVendorCredentialsEmail({
      to: email,
      vendorName: vendor.company_name,
      contactPerson: fullName || vendor.contact_person,
      password: password,
      portalUrl: portalUrl
    }).catch(err => console.error('[Email Error] Failed sending credentials email:', err));

    res.status(201).json({
      success: true,
      user: {
        id: result.lastID,
        vendorId: id,
        email,
        role: 'VENDOR'
      }
    });
  } catch (error) {
    console.error('Error creating vendor credentials:', error);
    res.status(500).json({ error: 'Failed to create vendor credentials' });
  }
});

export default router;

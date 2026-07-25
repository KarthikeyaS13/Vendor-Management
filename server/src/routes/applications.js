import express from 'express';
import { getDb } from '../config/db.js';
import bcrypt from 'bcrypt';
import { sendVendorCredentialsEmail } from '../utils/mailer.js';

const router = express.Router();

// GET /api/applications
// Fetch all invitations along with their application status and company details
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const applications = await db.all(`
      SELECT 
        i.id as invitation_id,
        i.invitationId as "invitationId",
        i.email,
        i.mobile,
        i.status as invitation_status,
        i.created_at as invitation_date,
        i.expires_at,
        i.contactPerson as "contactPerson",
        COALESCE(cp.legal_name, i.companyName) as company_name,
        a.id as application_id,
        a.application_number,
        a.status as application_status,
        a.submitted_at,
        bp.industry_category,
        fp.currency
      FROM vendor_invitations i
      LEFT JOIN vendor_applications a ON i.id = a.invitation_id
      LEFT JOIN vendor_company_profiles cp ON a.id = cp.application_id
      LEFT JOIN vendor_business_profiles bp ON a.id = bp.application_id
      LEFT JOIN vendor_financial_profiles fp ON a.id = fp.application_id
      ORDER BY i.created_at DESC
    `);
    
    // Calculate completion %
    // Basic logic:
    // Opened = 14%
    // Completed/Submitted = 100%
    // Otherwise 0%
    const formattedApps = applications.map(app => {
      let completion = 0;
      let status = app.invitation_status;
      
      if (app.application_status) {
        status = app.application_status;
        completion = 100; // Simplified for now since we don't track step progress in DB
      } else if (app.invitation_status === 'Opened') {
        completion = 14;
      }
      
      return {
        ...app,
        display_status: status,
        completion_percentage: completion
      };
    });

    res.json(formattedApps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch applications.', details: err.message });
  }
});

// GET /api/applications/:id
// Get detailed application data by invitation_id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    
    const invitation = await db.get('SELECT id, invitationId as "invitationId", companyName as "companyName", contactPerson as "contactPerson", email, mobile, token, temp_password, invited_by, status, expires_at, opened_at, submitted_at, created_at, updated_at FROM vendor_invitations WHERE id = ?', [id]);
    if (!invitation) return res.status(404).json({ error: 'Not found' });
    
    let application = null;
    let company = null;
    let business = null;
    let financial = null;
    let documents = [];

    application = await db.get('SELECT * FROM vendor_applications WHERE invitation_id = ?', [id]);
    
    if (application) {
      company = await db.get('SELECT * FROM vendor_company_profiles WHERE application_id = ?', [application.id]);
      business = await db.get('SELECT * FROM vendor_business_profiles WHERE application_id = ?', [application.id]);
      financial = await db.get('SELECT * FROM vendor_financial_profiles WHERE application_id = ?', [application.id]);
      documents = await db.all('SELECT * FROM vendor_documents WHERE application_id = ?', [application.id]);
    }

    res.json({
      invitation,
      application,
      company,
      business,
      financial,
      documents
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch application details.' });
  }
});

// PUT /api/applications/:id/status
// Update application status (e.g., Accept, Reject)
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'ACCEPTED' or 'REJECTED'

  try {
    const db = await getDb();
    
    // First, find the application id associated with this invitation_id
    const application = await db.get('SELECT id FROM vendor_applications WHERE invitation_id = ?', [id]);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found for this invitation.' });
    }

    await db.run(
      'UPDATE vendor_applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, application.id]
    );

    // Phase 2: If ACCEPTED, create a vendor master record
    if (status === 'ACCEPTED') {
      // Check if vendor already exists to prevent duplicates
      const existingVendor = await db.get('SELECT id FROM vendors WHERE application_id = ?', [application.id]);
      
      if (!existingVendor) {
        // Generate Vendor Code (e.g. VEN001)
        const lastVendor = await db.get('SELECT vendor_code FROM vendors ORDER BY id DESC LIMIT 1');
        let nextNumber = 1;
        if (lastVendor && lastVendor.vendor_code.startsWith('VEN')) {
          const lastNumber = parseInt(lastVendor.vendor_code.replace('VEN', ''), 10);
          if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
          }
        }
        const vendorCode = `VEN${nextNumber.toString().padStart(3, '0')}`;
        
        // Fetch necessary details to populate the vendor master
        const company = await db.get('SELECT legal_name FROM vendor_company_profiles WHERE application_id = ?', [application.id]);
        const business = await db.get('SELECT industry_category, gst_number, pan_number FROM vendor_business_profiles WHERE application_id = ?', [application.id]);
        const contact = await db.get('SELECT first_name, email, phone FROM vendor_contacts WHERE application_id = ? AND is_primary = true', [application.id]);
        const invitation = await db.get('SELECT contactPerson as "contactPerson", email, mobile FROM vendor_invitations WHERE id = ?', [id]);
        
        await db.run(`
          INSERT INTO vendors (
            vendor_code, application_id, company_name, contact_person, email, mobile, 
            industry, gst_number, pan_number, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          vendorCode,
          application.id,
          company?.legal_name || 'Unknown',
          contact?.first_name || invitation?.contactPerson || 'Unknown',
          contact?.email || invitation?.email || 'Unknown',
          contact?.phone || invitation?.mobile || '',
          business?.industry_category || '',
          business?.gst_number || '',
          business?.pan_number || '',
          'Active'
        ]);

        // Get the generated vendor id
        const newVendor = await db.get('SELECT id FROM vendors WHERE application_id = ?', [application.id]);

        if (newVendor) {
          // Generate temporary 12-character password
          const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
          let tempPassword = "";
          for (let i = 0; i < 12; i++) {
            tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
          }

          // Hash the password
          const passwordHash = await bcrypt.hash(tempPassword, 10);
          
          const vendorEmail = contact?.email || invitation?.email || 'Unknown';
          const vendorName = company?.legal_name || 'Unknown';

          // Insert into vendor_users
          await db.run(`
            INSERT INTO vendor_users (
              vendor_id, full_name, email, password_hash, role, is_active, must_change_password
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            newVendor.id,
            contact?.first_name || invitation?.contactPerson || 'Unknown',
            vendorEmail,
            passwordHash,
            'VENDOR',
            true,
            true
          ]);
          const host = req.get('host');
          const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
          const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || `${protocol}://${host}`;

          // Send Real Welcome Credentials Email
          sendVendorCredentialsEmail({
            to: vendorEmail,
            vendorName: vendorName,
            contactPerson: contact?.first_name || invitation?.contactPerson || vendorName,
            password: tempPassword,
            portalUrl: `${frontendUrl}/portal-login`
          }).catch(err => console.error('[Email Error] Failed sending approval welcome email:', err));
        }

        // Create an audit log for Vendor Creation
        await db.run(`
          INSERT INTO audit_logs (action, entity_type, entity_id, new_values)
          VALUES (?, ?, ?, ?)
        `, [
          'VENDOR_CREATED',
          'VENDOR',
          application.id, 
          JSON.stringify({ status: 'Active', vendor_code: vendorCode })
        ]);
      }
    }

    res.json({ success: true, message: `Application status updated to ${status}` });
  } catch (err) {
    console.error('Error updating application status:', err);
    res.status(500).json({ error: 'Failed to update application status.' });
  }
});

export default router;

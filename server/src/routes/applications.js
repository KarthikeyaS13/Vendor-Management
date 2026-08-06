import express from 'express';
import { getDb, pool, convertQuery, generateSequence } from '../config/db.js';
import bcrypt from 'bcrypt';
import { sendVendorCredentialsEmail } from '../utils/mailer.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/permissions.js';
import { isSuperAdmin, tenantWhere, tenantAnd, getAuditUserId } from '../utils/tenantQuery.js';

const router = express.Router();

// GET /api/applications
// Fetch all invitations along with their application status and company details
router.get('/', authenticateToken, authorize(PERMISSIONS.VENDOR_VIEW), async (req, res) => {
  try {
    const db = await getDb();
    const { whereClause, params } = tenantWhere(req.user, 'i');

    let query = `
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
      ${whereClause}
      ORDER BY i.created_at DESC
    `;

    const applications = await db.all(query, params);
    
    const formattedApps = applications.map(app => {
      let completion = 0;
      let status = app.invitation_status;
      
      if (app.application_status) {
        status = app.application_status;
        completion = 100;
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
router.get('/:id', authenticateToken, authorize(PERMISSIONS.VENDOR_VIEW), async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    const { andClause, params: tenantParams } = tenantAnd(req.user);
    
    const invitation = await db.get(
      `SELECT id, invitationId as "invitationId", companyName as "companyName", contactPerson as "contactPerson", email, mobile, token, temp_password, invited_by, status, expires_at, opened_at, submitted_at, created_at, updated_at FROM vendor_invitations WHERE id = ?${andClause}`,
      [id, ...tenantParams]
    );
    if (!invitation) return res.status(404).json({ error: 'Not found' });
    
    let application = null;
    let company = null;
    let business = null;
    let financial = null;
    let documents = [];

    application = await db.get(
      `SELECT * FROM vendor_applications WHERE invitation_id = ?${andClause}`,
      [id, ...tenantParams]
    );
    
    if (application) {
      const profParams = [application.id, ...tenantParams];
      company = await db.get(`SELECT * FROM vendor_company_profiles WHERE application_id = ?${andClause}`, profParams);
      business = await db.get(`SELECT * FROM vendor_business_profiles WHERE application_id = ?${andClause}`, profParams);
      financial = await db.get(`SELECT * FROM vendor_financial_profiles WHERE application_id = ?${andClause}`, profParams);
      documents = await db.all(`SELECT * FROM vendor_documents WHERE application_id = ?${andClause}`, profParams);
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
router.put('/:id/status', authenticateToken, authorize(PERMISSIONS.VENDOR_APPROVE), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'ACCEPTED' or 'REJECTED'

  try {
    const db = await getDb();
    const { andClause, params: tenantParams } = tenantAnd(req.user);
    
    // First, find the application id associated with this invitation_id
    const application = await db.get(
      `SELECT id, tenant_id FROM vendor_applications WHERE invitation_id = ?${andClause}`,
      [id, ...tenantParams]
    );
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found for this invitation.' });
    }

    const targetTenantId = application.tenant_id;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        convertQuery('UPDATE vendor_applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?'),
        [status, application.id, targetTenantId]
      );

      // Phase 2: If ACCEPTED, create a vendor master record
      if (status === 'ACCEPTED') {
        // Check if vendor already exists to prevent duplicates
        const existingVendorRes = await client.query(
          convertQuery('SELECT id FROM vendors WHERE application_id = ? AND tenant_id = ?'), 
          [application.id, targetTenantId]
        );
        const existingVendor = existingVendorRes.rows[0];
        
        if (!existingVendor) {
          // Generate Vendor Code (e.g. VEN001) safely using sequence
          const vendorCode = await generateSequence(client, targetTenantId, 'vendorConfig', 'VEN');
          
          // Fetch necessary details to populate the vendor master
          const companyRes = await client.query(convertQuery('SELECT legal_name FROM vendor_company_profiles WHERE application_id = ? AND tenant_id = ?'), [application.id, targetTenantId]);
          const company = companyRes.rows[0];
          
          const businessRes = await client.query(convertQuery('SELECT industry_category, gst_number, pan_number FROM vendor_business_profiles WHERE application_id = ? AND tenant_id = ?'), [application.id, targetTenantId]);
          const business = businessRes.rows[0];
          
          const contactRes = await client.query(convertQuery('SELECT first_name, email, phone FROM vendor_contacts WHERE application_id = ? AND is_primary = true AND tenant_id = ?'), [application.id, targetTenantId]);
          const contact = contactRes.rows[0];
          
          const invitationRes = await client.query(convertQuery('SELECT contactPerson as "contactPerson", email, mobile FROM vendor_invitations WHERE id = ? AND tenant_id = ?'), [id, targetTenantId]);
          const invitation = invitationRes.rows[0];
          
          await client.query(convertQuery(`
            INSERT INTO vendors (
              tenant_id, vendor_code, application_id, company_name, contact_person, email, mobile, 
              industry, gst_number, pan_number, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `), [
            targetTenantId,
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
          const newVendorRes = await client.query(convertQuery('SELECT id FROM vendors WHERE application_id = ? AND tenant_id = ?'), [application.id, targetTenantId]);
          const newVendor = newVendorRes.rows[0];

          if (newVendor) {
            const vendorEmail = contact?.email || invitation?.email || 'Unknown';
            const vendorName = company?.legal_name || 'Unknown';

            // Generate temporary password
            const emailPrefix = vendorEmail !== 'Unknown' ? vendorEmail.substring(0, 4) : 'vend';
            const tempPassword = `${emailPrefix}2026`;

            // Hash the password
            const passwordHash = await bcrypt.hash(tempPassword, 10);

            // Insert into vendor_users
            await client.query(convertQuery(`
              INSERT INTO vendor_users (
                tenant_id, vendor_id, full_name, email, password_hash, role, is_active, must_change_password
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `), [
              targetTenantId,
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
          const auditUserId = getAuditUserId(req.user);
          await client.query(convertQuery(`
            INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, new_values)
            VALUES (?, ?, ?, ?, ?, ?)
          `), [
            targetTenantId,
            auditUserId,
            'VENDOR_CREATED',
            'VENDOR',
            application.id, 
            JSON.stringify({ status: 'Active', vendor_code: vendorCode })
          ]);
        }
      }

      await client.query('COMMIT');
      res.json({ success: true, message: `Application status updated to ${status}` });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error updating application status:', err);
    res.status(500).json({ error: 'Failed to update application status.' });
  }
});

export default router;

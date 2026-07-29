import express from 'express';
import { getDb, pool, convertQuery, generateSequence } from '../config/db.js';

const router = express.Router();

router.post('/register/:token', async (req, res) => {
  const { token } = req.params;
  const formData = req.body;
  
  try {
    const db = await getDb();
    const invitation = await db.get('SELECT id, tenant_id, invitationId as "invitationId", companyName as "companyName", contactPerson as "contactPerson", email, mobile, token, temp_password, invited_by, status, expires_at, opened_at, submitted_at, created_at, updated_at FROM vendor_invitations WHERE token = ?', [token]);
    
    if (!invitation) return res.status(404).json({ error: 'Invalid token.' });
    if (invitation.status === 'Completed') return res.status(400).json({ error: 'Already registered.' });

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const appId = await generateSequence(client, invitation.tenant_id, 'appConfig', 'APP-');

      const appResult = await client.query(
        convertQuery(`INSERT INTO vendor_applications (tenant_id, invitation_id, application_number, status, submitted_at) VALUES (?, ?, ?, ?, ?) RETURNING id`),
        [invitation.tenant_id, invitation.id, appId, 'SUBMITTED', new Date().toISOString()]
      );
      
      const applicationId = appResult.rows[0].id;

      await client.query(
        convertQuery(`INSERT INTO vendor_company_profiles (tenant_id, application_id, legal_name, trade_name, entity_type, date_of_incorporation, website, address, city, state, contact_person, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
        [
          invitation.tenant_id,
          applicationId, 
          formData.vendorLegalName || '', 
          formData.vendorName || '', 
          formData.entityType || 'Private Limited', 
          formData.incorporationDate || '2000-01-01', 
          formData.website || '',
          formData.address || '',
          formData.city || '',
          formData.state || '',
          formData.contactPerson || invitation.contactPerson || '',
          formData.email1 || invitation.email || ''
        ]
      );

      await client.query(
        convertQuery(`INSERT INTO vendor_business_profiles (tenant_id, application_id, industry_category, vendor_type, primary_products, service_regions, gst_number, pan_number, pf_registration, esi_registration, labour_registration, it_filing, gst_filing) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
        [
          invitation.tenant_id,
          applicationId, 
          formData.vendorCategory || 'IT', 
          formData.vendorType || '',
          formData.primaryProducts || '', 
          formData.serviceRegions || '', 
          formData.gstin || '', 
          formData.pan || '',
          formData.pfRegistration || '',
          formData.esiRegistration || '',
          formData.labourRegistration || '',
          formData.itFiling || '',
          formData.gstFiling || ''
        ]
      );

      await client.query(
        convertQuery(`INSERT INTO vendor_financial_profiles (tenant_id, application_id, bank_name, bank_branch, account_name, account_number, account_type, ifsc_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
        [
          invitation.tenant_id,
          applicationId, 
          formData.bankName || 'Test Bank', 
          formData.bankBranch || '',
          formData.accountName || formData.vendorLegalName || 'Account Name', 
          formData.accountNumber || '', 
          formData.accountType || '',
          formData.ifsc || ''
        ]
      );

      // Insert primary contact
      await client.query(
        convertQuery(`INSERT INTO vendor_contacts (tenant_id, application_id, contact_type, first_name, last_name, email, phone, job_title, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`),
        [
          invitation.tenant_id,
          applicationId,
          'PRIMARY',
          formData.contactPerson || invitation.contactPerson || 'Unknown',
          '', // last name
          formData.email1 || invitation.email || '',
          formData.contactPhone || invitation.mobile || '',
          'Account Manager',
          true
        ]
      );

      await client.query(
        convertQuery(`UPDATE vendor_invitations SET status = 'Completed', submitted_at = ? WHERE id = ? AND tenant_id = ?`),
        [new Date().toISOString(), invitation.id, invitation.tenant_id]
      );

      await client.query('COMMIT');
      res.json({ message: 'Registration successful', applicationId: applicationId, applicationNumber: appId });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

export default router;

import express from 'express';
import { getDb } from '../config/db.js';

const router = express.Router();

router.post('/register/:token', async (req, res) => {
  const { token } = req.params;
  const formData = req.body;
  
  try {
    const db = await getDb();
    const invitation = await db.get('SELECT id, invitationId as "invitationId", companyName as "companyName", contactPerson as "contactPerson", email, mobile, token, temp_password, invited_by, status, expires_at, opened_at, submitted_at, created_at, updated_at FROM vendor_invitations WHERE token = ?', [token]);
    
    if (!invitation) return res.status(404).json({ error: 'Invalid token.' });
    if (invitation.status === 'Completed') return res.status(400).json({ error: 'Already registered.' });

    let nextNumber = 1;
    const lastApp = await db.get(`SELECT application_number FROM vendor_applications ORDER BY id DESC LIMIT 1`);
    if (lastApp && lastApp.application_number && lastApp.application_number.startsWith('APP-')) {
      const lastNumber = parseInt(lastApp.application_number.replace('APP-', ''), 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
    const appId = `APP-${nextNumber.toString().padStart(4, '0')}`;
    
    await db.run('BEGIN TRANSACTION');

    try {
      const appResult = await db.run(
        `INSERT INTO vendor_applications (invitation_id, application_number, status, submitted_at) VALUES (?, ?, ?, ?)`,
        [invitation.id, appId, 'SUBMITTED', new Date().toISOString()]
      );
      
      const applicationId = appResult.lastID;

      await db.run(
        `INSERT INTO vendor_company_profiles (application_id, legal_name, trade_name, entity_type, date_of_incorporation, website, address, city, state, contact_person, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
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

      await db.run(
        `INSERT INTO vendor_business_profiles (application_id, industry_category, vendor_type, primary_products, service_regions, gst_number, pan_number, pf_registration, esi_registration, labour_registration, it_filing, gst_filing) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
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

      await db.run(
        `INSERT INTO vendor_financial_profiles (application_id, bank_name, bank_branch, account_name, account_number, account_type, ifsc_code) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
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
      await db.run(
        `INSERT INTO vendor_contacts (application_id, contact_type, first_name, last_name, email, phone, job_title, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
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

      await db.run(
        `UPDATE vendor_invitations SET status = 'Completed', submitted_at = ? WHERE id = ?`,
        [new Date().toISOString(), invitation.id]
      );

      await db.run('COMMIT');
      res.json({ message: 'Registration successful', applicationId: applicationId, applicationNumber: appId });
    } catch (txErr) {
      await db.run('ROLLBACK');
      throw txErr;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

export default router;

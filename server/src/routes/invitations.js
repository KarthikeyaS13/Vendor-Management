import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import { getDb } from '../config/db.js';

const router = express.Router();

function getTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

// POST /api/invitations
router.post('/', async (req, res) => {
  const { companyName, email, mobile } = req.body;
  const contactPerson = req.body.contactPerson || 'N/A';
  if (!companyName || !email) {
    return res.status(400).json({ error: 'Company Name and Email are required.' });
  }

  const token = uuidv4();
  const invitationId = 'INV-' + Date.now();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const db = await getDb();
    const tempPassword = Math.random().toString(36).slice(-8);

    await db.run(
      `INSERT INTO vendor_invitations 
      (invitationId, companyName, contactPerson, email, mobile, token, temp_password, status, expires_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?)`,
      [invitationId, companyName, contactPerson, email, mobile || null, token, tempPassword, expiresAt]
    );

    const registrationUrl = `http://localhost:5173/vendor-login?token=${token}`;

    console.log(`[Email System] Sending invitation email to ${email}. Link: ${registrationUrl}`);
    
    let previewUrl = null;
    
    console.log("SMTP_USER =", process.env.SMTP_USER);
    console.log("SMTP_PASS exists =", !!process.env.SMTP_PASS);

    const transporter = getTransporter();

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('[Email System] WARNING: SMTP credentials are not configured. Invitation created but email was not sent.');
    } else if (transporter) {
      try {
        const info = await transporter.sendMail({
          from: `"${process.env.FROM_NAME}" <${process.env.SMTP_USER}>`,
          to: email,
          subject: "Vendor Registration Invitation",
          text: `You have been invited to register as a vendor. Please complete your registration here: ${registrationUrl}\nUsername: ${email}\nPassword: ${tempPassword}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #6366f1; padding: 24px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 24px;">Nexus Vendor Portal</h1>
              </div>
              <div style="padding: 32px; color: #374151;">
                <h2 style="margin-top: 0; color: #111827;">Dear ${companyName},</h2>
                <p>We are pleased to welcome you to the Nexus Vendor Portal. Your vendor portal account has been created successfully. Please use the login credentials below to access your account:</p>
                
                <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 24px 0;">
                  <table style="width: 100%; text-align: left; border-collapse: collapse;">
                    <tr>
                      <th style="padding: 8px 0; color: #6b7280; width: 100px;">Username</th>
                      <td style="padding: 8px 0; font-weight: bold; color: #111827;">${email}</td>
                    </tr>
                    <tr>
                      <th style="padding: 8px 0; color: #6b7280;">Password</th>
                      <td style="padding: 8px 0; font-weight: bold; color: #111827;">${tempPassword}</td>
                    </tr>
                  </table>
                </div>

                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin-bottom: 24px; border-radius: 0 4px 4px 0;">
                  <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>Security Tip:</strong> For better security, please change your password after your first login.</p>
                </div>

                <h3 style="color: #111827; margin-top: 32px; font-size: 16px;">Next Steps</h3>
                <ol style="color: #4b5563; padding-left: 20px; line-height: 1.6; font-size: 14px;">
                  <li>Open the Vendor Portal using the button/link below.</li>
                  <li>Log in using your Username and Password.</li>
                  <li>Complete your vendor profile and upload the required documents.</li>
                </ol>

                <div style="text-align: center; margin: 40px 0;">
                  <a href="${registrationUrl}" style="background-color: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Complete Registration &rarr;</a>
                </div>

                <p style="margin-bottom: 4px; color: #6b7280; font-size: 14px;">Best regards,</p>
                <p style="margin-top: 0; font-weight: bold; color: #111827;">Nexus Procurement Team</p>
              </div>
              <div style="background-color: #6366f1; padding: 16px; text-align: center; color: rgba(255, 255, 255, 0.8); font-size: 12px;">
                Vendor Onboarding Process<br>
                &copy; ${new Date().getFullYear()} All rights reserved.
              </div>
            </div>
          `
        });
        console.log(`[Email System] Message sent: %s`, info.messageId);
      } catch (emailErr) {
        console.error('[Email System] SMTP Send Error:', emailErr);
        console.warn('[Email System] Invitation created, but email delivery failed. Continuing workflow.');
      }
    } else {
      console.warn('[Email System] WARNING: Email transporter is not initialized. Email was not sent.');
    }

    res.status(201).json({ message: 'Invitation created successfully', invitationId, token, emailSent: !!transporter });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create invitation: ' + err.message });
  }
});

// GET /api/invitations
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const invitations = await db.all('SELECT * FROM vendor_invitations ORDER BY created_at DESC');
    res.json(invitations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invitations.' });
  }
});

// GET /api/invitations/:token
router.get('/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const db = await getDb();
    const invitation = await db.get('SELECT * FROM vendor_invitations WHERE token = ?', [token]);
    
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found or invalid.' });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired.' });
    }

    if (invitation.status === 'Completed' || invitation.status === 'Cancelled') {
      return res.status(400).json({ error: `Invitation is already ${invitation.status}.` });
    }

    if (invitation.status === 'Pending') {
      await db.run('UPDATE vendor_invitations SET status = ?, opened_at = ? WHERE id = ?', ['Opened', new Date().toISOString(), invitation.id]);
      invitation.status = 'Opened';
    }

    res.json(invitation);
  } catch (err) {
    res.status(500).json({ error: 'Failed to validate token.' });
  }
});

// POST /api/invitations/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const db = await getDb();
    const invitation = await db.get('SELECT * FROM vendor_invitations WHERE email = ? AND temp_password = ?', [email, password]);

    if (!invitation) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired.' });
    }

    if (invitation.status === 'Completed' || invitation.status === 'Cancelled') {
      return res.status(400).json({ error: `Invitation is already ${invitation.status}.` });
    }

    // Login successful, return the token so frontend can redirect to registration wizard
    res.json({ message: 'Login successful', token: invitation.token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log in.' });
  }
});

export default router;

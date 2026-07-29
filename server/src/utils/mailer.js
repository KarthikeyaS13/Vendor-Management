import nodemailer from 'nodemailer';

export function getTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[Mailer] SMTP_USER or SMTP_PASS missing in environment variables.');
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

/**
 * Send email when vendor profile details / email is updated
 */
export async function sendVendorProfileUpdateEmail({ to, vendorName, contactPerson, oldEmail, newEmail }) {
  const transporter = getTransporter();
  if (!transporter) return false;

  const recipients = [to];
  if (oldEmail && oldEmail !== to) {
    recipients.push(oldEmail);
  }

  const fromName = process.env.FROM_NAME || 'Nexus Procurement';
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const loginUrl = `${appUrl}/portal-login`;
  
  const mailOptions = {
    from: `"${fromName}" <${process.env.SMTP_USER}>`,
    to: recipients.join(', '),
    subject: `Vendor Profile Details Updated - ${vendorName}`,
    text: `Dear ${contactPerson || vendorName},\n\nYour company and contact profile details have been successfully updated in our system.\n\nAll future notifications, purchase orders, invoice updates, and portal login credentials are now linked to this email address (${to}).\n\nLogin URL: ${loginUrl}\n\nIf you did not request this update, please contact our support team immediately.\n\nBest regards,\n${fromName} Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #2563eb; padding: 25px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">Vendor Profile Updated</h2>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
          <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">Dear <strong>${contactPerson || vendorName}</strong>,</p>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">This email confirms that your vendor profile details for <strong>${vendorName}</strong> have been successfully updated in our Procurement System.</p>
          
          <div style="margin: 25px 0; padding: 18px 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Update Summary</p>
            <p style="margin: 4px 0; color: #1e293b; font-size: 14px;"><strong>Updated Email:</strong> ${to}</p>
            <p style="margin: 4px 0; color: #1e293b; font-size: 14px;"><strong>Contact Person:</strong> ${contactPerson || vendorName}</p>
          </div>

          <div style="padding: 14px 18px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px; margin-bottom: 25px;">
            <p style="margin: 0; color: #1d4ed8; font-size: 14px; font-weight: 500;">
              ℹ️ All future system notifications, purchase orders, invoice payment alerts, and portal logins are now synchronized with this email address.
            </p>
          </div>



          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 13px; color: #94a3b8; margin: 0; line-height: 1.5;">Best regards,<br/><strong style="color: #64748b;">${fromName} Team</strong></p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.info(`[Email] Profile update email sent to ${recipients.join(', ')}: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error('[Email] Failed to send profile update email:', err);
    return false;
  }
}

/**
 * Send email when vendor credentials are created or reset
 */
export async function sendVendorCredentialsEmail({ to, vendorName, contactPerson, password, portalUrl }) {
  const transporter = getTransporter();
  if (!transporter) return false;

  const fromName = process.env.FROM_NAME || 'Nexus Procurement';
  const mailOptions = {
    from: `"${fromName}" <${process.env.SMTP_USER}>`,
    to,
    subject: `Vendor Portal Account Credentials - ${vendorName}`,
    text: `Dear ${contactPerson || vendorName},\n\nYour vendor portal account has been created.\n\nLogin URL: ${portalUrl}\nUsername / Email: ${to}\nTemporary Password: ${password}\n\nPlease login and change your password.\n\nBest regards,\n${fromName} Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #0f172a; padding: 25px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">Vendor Portal Credentials</h2>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
          <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">Dear <strong>${contactPerson || vendorName}</strong>,</p>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">Your vendor portal account for <strong>${vendorName}</strong> is ready. You can log in using the temporary credentials below:</p>
          
          <div style="margin: 25px 0; padding: 20px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px;"><strong>Portal Login Email:</strong> <span style="font-family: monospace; font-weight: 600; color: #0284c7;">${to}</span></p>
            <p style="margin: 0; color: #475569; font-size: 14px;"><strong>Temporary Password:</strong> <span style="font-family: monospace; font-weight: 600; color: #0284c7;">${password}</span></p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${portalUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">Access Vendor Portal</a>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 13px; color: #94a3b8; margin: 0; line-height: 1.5;">Best regards,<br/><strong style="color: #64748b;">${fromName} Team</strong></p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.info(`[Email] Credentials email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error('[Email] Failed to send credentials email:', err);
    return false;
  }
}

/**
 * Send email when Purchase Order is issued to vendor
 */
export async function sendPOCreatedEmail({ to, vendorName, poNumber, totalAmount, poDate, attachment }) {
  const transporter = getTransporter();
  if (!transporter) return false;

  const fromName = process.env.FROM_NAME || 'Nexus Procurement';
  const formattedAmount = totalAmount ? `₹${Number(totalAmount).toLocaleString('en-IN')}` : 'N/A';
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const loginUrl = `${appUrl}/portal-login`;

  const mailOptions = {
    from: `"${fromName}" <${process.env.SMTP_USER}>`,
    to,
    subject: `New Purchase Order Issued - ${poNumber}`,
    text: `Dear ${vendorName},\n\nA new Purchase Order ${poNumber} has been issued to your company.\n\nDate: ${poDate}\nTotal Amount: ${formattedAmount}\n\nPlease check your Vendor Portal to review and acknowledge.\n\nBest regards,\n${fromName} Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #2563eb; padding: 25px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">Purchase Order Issued</h2>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
          <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">Dear <strong>${vendorName}</strong>,</p>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">We are pleased to issue Purchase Order <strong>#${poNumber}</strong> to your company.</p>
          
          <div style="margin: 25px 0; padding: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px; text-transform: uppercase; font-weight: 700;">Order Details</p>
            <p style="margin: 4px 0; color: #1e293b; font-size: 14px;"><strong>PO Number:</strong> #${poNumber}</p>
            <p style="margin: 4px 0; color: #1e293b; font-size: 14px;"><strong>PO Date:</strong> ${poDate}</p>
            <p style="margin: 4px 0; color: #1e293b; font-size: 14px;"><strong>Total Value:</strong> <span style="color: #16a34a; font-weight: 700;">${formattedAmount}</span></p>
          </div>



          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 13px; color: #94a3b8; margin: 0; line-height: 1.5;">Best regards,<br/><strong style="color: #64748b;">${fromName} Team</strong></p>
        </div>
      </div>
    `
  };

  if (attachment && attachment.includes('base64,')) {
    const base64Data = attachment.split('base64,')[1];
    mailOptions.attachments = [
      {
        filename: `${poNumber || 'Purchase_Order'}.pdf`,
        content: base64Data,
        encoding: 'base64'
      }
    ];
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.info(`[Email] PO email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error('[Email] Failed to send PO email:', err);
    return false;
  }
}


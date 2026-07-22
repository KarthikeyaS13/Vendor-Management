import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';
import nodemailer from 'nodemailer';

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

const router = express.Router();
router.use(authenticateToken);

// Set up multer for invoice uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/invoices/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// GET /api/invoices
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    
    let query = `
      SELECT 
        i.*,
        p.po_number,
        v.company_name as vendor_name
      FROM purchase_invoices i
      JOIN purchase_orders p ON i.purchase_order_id = p.id
      JOIN vendors v ON i.vendor_id = v.id
    `;
    const params = [];

    // Filter by vendor if a vendorId exists on the user token
    if (req.user && req.user.vendorId) {
      query += ` WHERE i.vendor_id = ? `;
      params.push(req.user.vendorId);
    }
    
    query += ` ORDER BY i.created_at DESC `;
    
    const invoices = await db.all(query, params);
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// GET /api/invoices/:id
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    
    let query = `
      SELECT 
        i.*,
        p.po_number, p.po_date, p.company_name as buyer_company, p.company_address as buyer_address, p.company_gstin as buyer_gstin,
        v.company_name as vendor_name, v.email as vendor_email, v.mobile as vendor_mobile, v.gst_number as vendor_gstin, v.pan_number as vendor_pan
      FROM purchase_invoices i
      JOIN purchase_orders p ON i.purchase_order_id = p.id
      JOIN vendors v ON i.vendor_id = v.id
      WHERE i.id = ?
    `;
    const params = [req.params.id];

    if (req.user && req.user.vendorId) {
      query += ' AND i.vendor_id = ?';
      params.push(req.user.vendorId);
    }

    const invoice = await db.get(query, params);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Fetch associated items
    const items = await db.all(`
      SELECT 
        ii.*,
        pi.particulars, pi.line_number
      FROM purchase_invoice_items ii
      JOIN purchase_order_items pi ON ii.purchase_order_item_id = pi.id
      WHERE ii.invoice_id = ?
      ORDER BY pi.line_number ASC
    `, [req.params.id]);
    
    invoice.items = items || [];
    
    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice details:', error);
    res.status(500).json({ error: 'Failed to fetch invoice details' });
  }
});

// POST /api/invoices
router.post('/', upload.single('invoice_file'), async (req, res) => {
  try {
    const db = await getDb();
    
    const invoiceData = JSON.parse(req.body.data);
    const {
      invoice_number,
      invoice_date,
      delivery_challan_reference,
      purchase_order_id,
      vendor_id,
      subtotal,
      gst_total,
      grand_total,
      items // Array of items
    } = invoiceData;

    // Security Check: VENDOR can only submit for themselves
    if (req.user && req.user.vendorId && parseInt(vendor_id) !== req.user.vendorId) {
      return res.status(403).json({ error: 'Forbidden: Cannot submit invoice for another vendor' });
    }

    // Check if PO exists and belongs to the vendor
    const po = await db.get('SELECT * FROM purchase_orders WHERE id = ? AND vendor_id = ?', [purchase_order_id, vendor_id]);
    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found or unauthorized' });
    }

    // Uniqueness Check: Invoice Number (per vendor)
    const existingInvoice = await db.get(
      'SELECT id FROM purchase_invoices WHERE invoice_number = ? AND vendor_id = ?', 
      [invoice_number, vendor_id]
    );
    if (existingInvoice) {
      return res.status(400).json({ error: 'An invoice with this Invoice Number already exists.' });
    }

    // Uniqueness Check: Delivery Challan (per vendor)
    if (delivery_challan_reference && delivery_challan_reference.trim() !== '') {
      const existingDC = await db.get(
        'SELECT id FROM purchase_invoices WHERE delivery_challan_reference = ? AND vendor_id = ?', 
        [delivery_challan_reference, vendor_id]
      );
      if (existingDC) {
        return res.status(400).json({ error: 'An invoice with this Delivery Challan Reference already exists.' });
      }
    }

    const filePath = req.file ? req.file.path : null;

    await db.run('BEGIN TRANSACTION');

    const result = await db.run(`
      INSERT INTO purchase_invoices (
        invoice_number, invoice_date, delivery_challan_reference,
        purchase_order_id, vendor_id, subtotal, gst_total, grand_total, status, invoice_file
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Submitted', ?)
    `, [
      invoice_number, invoice_date, delivery_challan_reference,
      purchase_order_id, vendor_id, subtotal, gst_total, grand_total, filePath
    ]);

    const invoiceId = result.lastID;

    if (items && items.length > 0) {
      for (const item of items) {
        await db.run(`
          INSERT INTO purchase_invoice_items (
            invoice_id, purchase_order_item_id, ordered_quantity, supplied_quantity,
            rate, gst_rate, hsn_code, tax_amount, line_total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          invoiceId, item.purchase_order_item_id, item.ordered_quantity, item.supplied_quantity,
          item.rate, item.gst_rate, item.hsn_code, item.tax_amount, item.line_total
        ]);
      }
    }

    await db.run('COMMIT');

    res.status(201).json({ success: true, id: invoiceId });
  } catch (error) {
    const db = await getDb();
    await db.run('ROLLBACK');
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice: ' + error.message });
  }
});

// PUT /api/invoices/:id/status
router.put('/:id/status', async (req, res) => {
  // Only Admin can change status like this
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  const { status, remarks } = req.body;
  const validStatuses = ['Under Review', 'Approved', 'Rejected', 'Clarification_Requested', 'Ready for Payment', 'Payment Processing', 'Paid', 'Closed'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const db = await getDb();
    const updateField = status === 'Approved' ? 'approved_at = CURRENT_TIMESTAMP' : 'updated_at = CURRENT_TIMESTAMP';
    
    await db.run(`
      UPDATE purchase_invoices 
      SET status = ?, remarks = ?, ${updateField}
      WHERE id = ?
    `, [status, remarks || null, req.params.id]);

    // Send email notification if approved
    if (status === 'Approved') {
      try {
        const invoice = await db.get(`
          SELECT i.invoice_number, v.email, v.company_name, v.contact_person 
          FROM purchase_invoices i 
          JOIN vendors v ON i.vendor_id = v.id 
          WHERE i.id = ?
        `, [req.params.id]);
        
        if (invoice && invoice.email) {
          const transporter = getTransporter();
          if (transporter) {
            await transporter.sendMail({
              from: `"${process.env.FROM_NAME || 'Nexus Procurement'}" <${process.env.SMTP_USER}>`,
              to: invoice.email,
              subject: "Invoice Approved",
              text: `Dear ${invoice.contact_person || 'Vendor'},\n\nYour Invoice ${invoice.invoice_number} has been approved.\n\nBest regards,\nNexus Procurement Team`,
            });
            console.log(`[Email] Approval email sent to ${invoice.email} for invoice ${invoice.invoice_number}`);
          }
        }
      } catch (emailErr) {
        console.error('[Email] Failed to send approval email:', emailErr);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
});

// PUT /api/invoices/:id/pay
router.put('/:id/pay', async (req, res) => {
  // Only Admin can mark as paid
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  const { payment_reference, payment_mode, payment_date, bank_name, remarks } = req.body;

  if (!payment_reference || !payment_mode || !payment_date) {
    return res.status(400).json({ error: 'Payment reference, mode, and date are required' });
  }

  try {
    const db = await getDb();
    
    const invoice = await db.get('SELECT status, purchase_order_id FROM purchase_invoices WHERE id = ?', [req.params.id]);
    if (!invoice || invoice.status !== 'Approved') {
      return res.status(400).json({ error: 'Invoice must be Approved before payment' });
    }

    await db.run('BEGIN TRANSACTION');

    await db.run(`
      UPDATE purchase_invoices 
      SET status = 'Paid', payment_reference = ?, payment_mode = ?, bank_name = ?, payment_date = ?, remarks = ?, paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [payment_reference, payment_mode, bank_name || null, payment_date, remarks || null, req.params.id]);

    // Skipping PO status update to avoid SQLite CHECK constraint error on 'Completed'
    // A PO might have multiple invoices, so keeping it 'Issued' is safer.

    await db.run('COMMIT');

    // Send payment email
    try {
      const invDetails = await db.get(`
        SELECT i.invoice_number, i.grand_total, v.email, v.contact_person 
        FROM purchase_invoices i 
        JOIN vendors v ON i.vendor_id = v.id 
        WHERE i.id = ?
      `, [req.params.id]);
      
      if (invDetails && invDetails.email) {
        const transporter = getTransporter();
        if (transporter) {
          await transporter.sendMail({
            from: `"${process.env.FROM_NAME || 'Nexus Finance'}" <${process.env.SMTP_USER}>`,
            to: invDetails.email,
            subject: "Payment Processed",
            text: `Dear ${invDetails.contact_person || 'Vendor'},\n\nYour payment for Invoice ${invDetails.invoice_number} has been processed.\n\nAmount: ₹${invDetails.grand_total.toLocaleString('en-IN')}\nReference: ${payment_reference}\nDate: ${payment_date}\n\nBest regards,\nNexus Finance Team`,
          });
          console.log(`[Email] Payment email sent to ${invDetails.email} for invoice ${invDetails.invoice_number}`);
        }
      }
    } catch (emailErr) {
      console.error('[Email] Failed to send payment email:', emailErr);
    }

    res.json({ success: true });
  } catch (error) {
    const db = await getDb();
    await db.run('ROLLBACK');
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

export default router;

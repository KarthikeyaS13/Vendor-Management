import express from 'express';
import { getDb } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendPOCreatedEmail } from '../utils/mailer.js';

const router = express.Router();
router.use(authenticateToken);

// Utility function to generate the next PO Number
async function generateNextPONumber(db) {
  // Try to fetch custom config
  let configRow;
  try {
    configRow = await db.get("SELECT value FROM system_config WHERE key = 'poConfig'");
  } catch (e) {
    // ignore if table doesn't exist yet
  }

  let poConfig = { prefix: 'PO', nextNumber: 1, padding: 3 };
  if (configRow && configRow.value) {
    try {
      poConfig = { ...poConfig, ...JSON.parse(configRow.value) };
    } catch (e) {
      console.error('Failed to parse poConfig');
    }
  }

  // Also update nextNumber in config so it increments properly for the future
  try {
    const nextConfig = { ...poConfig, nextNumber: poConfig.nextNumber + 1 };
    await db.run(
      "INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value RETURNING key",
      ['poConfig', JSON.stringify(nextConfig)]
    );
  } catch (e) {
    console.error('Failed to update nextNumber', e);
  }

  return `${poConfig.prefix}${String(poConfig.nextNumber).padStart(poConfig.padding, '0')}`;
}

// GET /api/purchase-orders
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    
    let query = `
      SELECT 
        po.id, po.po_number, po.po_date, po.company_name, po.vendor_name, po.status, po.created_at,
        CASE WHEN 
          (SELECT COALESCE(SUM(quantity), 0) FROM purchase_order_items WHERE purchase_order_id = po.id) 
          <= 
          (SELECT COALESCE(SUM(pii.supplied_quantity), 0) 
           FROM purchase_invoice_items pii 
           JOIN purchase_invoices pi ON pi.id = pii.invoice_id 
           JOIN purchase_order_items poi ON poi.id = pii.purchase_order_item_id 
           WHERE poi.purchase_order_id = po.id AND pi.status != 'Rejected')
        THEN 1 ELSE 0 END as is_completely_invoiced
      FROM purchase_orders po
      WHERE po.is_latest_revision = TRUE
    `;
    const params = [];

    if (req.user && req.user.vendorId) {
      query += ` AND po.vendor_id = ? `;
      params.push(req.user.vendorId);
    }
    
    query += ` ORDER BY po.created_at DESC `;
    
    const pos = await db.all(query, params);
    res.json(pos);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

// GET /api/purchase-orders/:id
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    
    let query = 'SELECT * FROM purchase_orders WHERE id = ?';
    const params = [req.params.id];

    if (req.user && req.user.vendorId) {
      query += ' AND vendor_id = ?';
      params.push(req.user.vendorId);
    }

    const po = await db.get(query, params);
    
    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }
    
    // Fetch associated items with previously invoiced quantities
    const items = await db.all(`
      SELECT 
        poi.id, 
        poi.line_number as sl_no, 
        poi.particulars, 
        poi.quantity, 
        poi.rate, 
        poi.value,
        (
          SELECT COALESCE(SUM(pii.supplied_quantity), 0)
          FROM purchase_invoice_items pii
          JOIN purchase_invoices pi ON pii.invoice_id = pi.id
          WHERE pii.purchase_order_item_id = poi.id
          AND pi.status != 'Rejected'
        ) as previously_invoiced_quantity
      FROM purchase_order_items poi
      WHERE poi.purchase_order_id = ?
      ORDER BY poi.line_number ASC
    `, [req.params.id]);
    
    po.items = items || [];
    
    res.json(po);
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({ error: 'Failed to fetch purchase order' });
  }
});

// GET /api/purchase-orders/:id/revisions
router.get('/:id/revisions', async (req, res) => {
  try {
    const db = await getDb();
    
    // First find the base_po_number for this ID
    const po = await db.get('SELECT po_number, base_po_number FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }
    
    const baseNumber = po.base_po_number || po.po_number;
    
    let query = `
      SELECT id, po_number, revision_number, is_latest_revision, status, created_at as edited_at, po_date
      FROM purchase_orders 
      WHERE (base_po_number = ? OR po_number = ?)
    `;
    const params = [baseNumber, baseNumber];

    if (req.user && req.user.vendorId) {
      query += ' AND vendor_id = ?';
      params.push(req.user.vendorId);
    }
    
    query += ' ORDER BY revision_number ASC';
    
    const revisions = await db.all(query, params);
    res.json(revisions);
  } catch (error) {
    console.error('Error fetching PO revisions:', error);
    res.status(500).json({ error: 'Failed to fetch revisions' });
  }
});

// POST /api/purchase-orders
router.post('/', async (req, res) => {
  console.log('--- PO Creation Auth Check ---');
  console.log('JWT Payload:', req.user);
  console.log('Role:', req.user?.role);
  
  const allowedRoles = ['admin', 'ADMIN', 'PROCUREMENT', 'FINANCE', 'COMPLIANCE', 'MANAGEMENT'];
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  try {
    const db = await getDb();
    
    // Generate PO Number automatically
    const po_number = await generateNextPONumber(db);

    const {
      po_date,
      company_name,
      company_address,
      company_gstin,
      vendor_id,
      vendor_name,
      vendor_address,
      vendor_gstin,
      vendor_pan,
      delivery_same_as_company,
      delivery_address,
      delivery_city,
      delivery_state,
      delivery_pincode,
      delivery_contact_person,
      delivery_phone,
      terms_and_conditions,
      total_amount,
      status,
      items
    } = req.body;

    const poStatus = status || 'Draft';

    await db.run('BEGIN TRANSACTION');

    const result = await db.run(`
      INSERT INTO purchase_orders (
        po_number, base_po_number, revision_number, is_latest_revision,
        po_date, company_name, company_address, company_gstin,
        vendor_id, vendor_name, vendor_address, vendor_gstin, vendor_pan,
        delivery_same_as_company, delivery_address, delivery_city, delivery_state,
        delivery_pincode, delivery_contact_person, delivery_phone,
        terms_and_conditions, total_amount, status
      ) VALUES (?, ?, 0, TRUE, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      po_number, po_number, po_date, company_name, company_address, company_gstin,
      vendor_id, vendor_name, vendor_address, vendor_gstin, vendor_pan,
      !!delivery_same_as_company, delivery_address, delivery_city, delivery_state,
      delivery_pincode, delivery_contact_person, delivery_phone,
      terms_and_conditions, total_amount, poStatus
    ]);

    const poId = result.lastID;

    // Insert items if provided
    if (items && items.length > 0) {
      const validItems = items.filter(i => i.particulars && i.quantity && i.rate);
      for (const item of validItems) {
        await db.run(`
          INSERT INTO purchase_order_items (
            purchase_order_id, line_number, particulars, quantity, rate, value
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          poId, 
          item.sl_no, 
          item.particulars, 
          Number(item.quantity) || 0, 
          Number(item.rate) || 0, 
          Number(item.value) || 0
        ]);
      }
    }

    await db.run('COMMIT');

    // Send email notification to vendor
    if (vendor_id) {
      try {
        const v = await db.get('SELECT email, company_name FROM vendors WHERE id = ?', [vendor_id]);
        if (v && v.email) {
          sendPOCreatedEmail({
            to: v.email,
            vendorName: v.company_name || vendor_name,
            poNumber: po_number,
            totalAmount: total_amount,
            poDate: po_date,
            attachment: req.body.poAttachment
          }).catch(err => console.error('[Email Error] Failed sending PO email:', err));
        }
      } catch (e) {
        console.warn('Could not fetch vendor for PO email:', e.message);
      }
    }

    res.status(201).json({ success: true, id: poId, po_number });
  } catch (error) {
    const db = await getDb();
    await db.run('ROLLBACK');
    console.error('Error creating purchase order:', error);
    res.status(500).json({ error: 'Failed to create purchase order' });
  }
});

// PUT /api/purchase-orders/:id
router.put('/:id', async (req, res) => {
  console.log('--- PO Update Auth Check ---');
  console.log('JWT Payload:', req.user);
  console.log('Role:', req.user?.role);
  
  const allowedRoles = ['admin', 'ADMIN', 'PROCUREMENT', 'FINANCE', 'COMPLIANCE', 'MANAGEMENT'];
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  try {
    const db = await getDb();
    
    const {
      po_date,
      company_name,
      company_address,
      company_gstin,
      vendor_id,
      vendor_name,
      vendor_address,
      vendor_gstin,
      vendor_pan,
      delivery_same_as_company,
      delivery_address,
      delivery_city,
      delivery_state,
      delivery_pincode,
      delivery_contact_person,
      delivery_phone,
      terms_and_conditions,
      total_amount,
      status,
      items
    } = req.body;

    const poId = req.params.id;

    const existingPo = await db.get('SELECT * FROM purchase_orders WHERE id = ?', [poId]);
    if (!existingPo) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    if (existingPo.is_latest_revision === 0 || existingPo.is_latest_revision === false) {
      return res.status(400).json({ error: 'Cannot edit a historical revision. Only the latest revision can be edited.' });
    }

    await db.run('BEGIN TRANSACTION');

    let newPoId = poId;

    if (existingPo.status !== 'Draft') {
      // Create a new revision
      const basePoNumber = existingPo.base_po_number || existingPo.po_number;
      const newRevisionNumber = (existingPo.revision_number || 0) + 1;
      const newPoNumber = `${basePoNumber}/${String(newRevisionNumber).padStart(2, '0')}`;

      // Mark current as not latest
      await db.run('UPDATE purchase_orders SET is_latest_revision = FALSE WHERE id = ?', [poId]);

      const result = await db.run(`
        INSERT INTO purchase_orders (
          po_number, base_po_number, revision_number, parent_po_id, is_latest_revision,
          po_date, company_name, company_address, company_gstin,
          vendor_id, vendor_name, vendor_address, vendor_gstin, vendor_pan,
          delivery_same_as_company, delivery_address, delivery_city, delivery_state,
          delivery_pincode, delivery_contact_person, delivery_phone,
          terms_and_conditions, total_amount, status, created_at
        ) VALUES (?, ?, ?, ?, TRUE, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        newPoNumber, basePoNumber, newRevisionNumber, poId,
        po_date, company_name, company_address, company_gstin,
        vendor_id, vendor_name, vendor_address, vendor_gstin, vendor_pan,
        !!delivery_same_as_company, delivery_address, delivery_city, delivery_state,
        delivery_pincode, delivery_contact_person, delivery_phone,
        terms_and_conditions, total_amount, status || 'Draft'
      ]);
      
      newPoId = result.lastID;
    } else {
      // Update in place for Drafts
      await db.run(`
        UPDATE purchase_orders SET
          po_date = ?, company_name = ?, company_address = ?, company_gstin = ?,
          vendor_id = ?, vendor_name = ?, vendor_address = ?, vendor_gstin = ?, vendor_pan = ?,
          delivery_same_as_company = ?, delivery_address = ?, delivery_city = ?, delivery_state = ?,
          delivery_pincode = ?, delivery_contact_person = ?, delivery_phone = ?,
          terms_and_conditions = ?, total_amount = ?, status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        po_date, company_name, company_address, company_gstin,
        vendor_id, vendor_name, vendor_address, vendor_gstin, vendor_pan,
        !!delivery_same_as_company, delivery_address, delivery_city, delivery_state,
        delivery_pincode, delivery_contact_person, delivery_phone,
        terms_and_conditions, total_amount, status,
        poId
      ]);
      
      // Delete existing items for in-place update
      await db.run('DELETE FROM purchase_order_items WHERE purchase_order_id = ?', [poId]);
    }

    // Insert new items for the correct PO ID (new or existing)
    if (items && items.length > 0) {
      const validItems = items.filter(i => i.particulars && i.quantity && i.rate);
      for (const item of validItems) {
        await db.run(`
          INSERT INTO purchase_order_items (
            purchase_order_id, line_number, particulars, quantity, rate, value
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          newPoId, 
          item.sl_no || item.line_number, 
          item.particulars, 
          Number(item.quantity) || 0, 
          Number(item.rate) || 0, 
          Number(item.value) || 0
        ]);
      }
    }

    await db.run('COMMIT');

    // If a new revision was created (or status changed to Accepted/Issued), send email notification
    if (existingPo.status !== 'Draft' && status !== 'Draft' && vendor_id) {
      try {
        const v = await db.get('SELECT email, company_name FROM vendors WHERE id = ?', [vendor_id]);
        if (v && v.email) {
          sendPOCreatedEmail({
            to: v.email,
            vendorName: v.company_name || vendor_name,
            poNumber: existingPo.status !== 'Draft' ? `${existingPo.base_po_number || existingPo.po_number}/${String((existingPo.revision_number || 0) + 1).padStart(2, '0')}` : existingPo.po_number,
            totalAmount: total_amount,
            poDate: po_date,
            attachment: req.body.poAttachment
          }).catch(err => console.error('[Email Error] Failed sending PO email for revision:', err));
        }
      } catch (e) {
        console.warn('Could not fetch vendor for PO email on update:', e.message);
      }
    }

    res.json({ success: true, id: newPoId });
  } catch (error) {
    const db = await getDb();
    await db.run('ROLLBACK');
    console.error('Error updating purchase order:', error);
    res.status(500).json({ error: 'Failed to update purchase order' });
  }
});

export default router;

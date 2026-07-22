import express from 'express';
import { getDb } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Utility function to generate the next PO Number
async function generateNextPONumber(db) {
  const lastPO = await db.get(`
    SELECT po_number FROM purchase_orders 
    WHERE po_number IS NOT NULL 
    ORDER BY id DESC LIMIT 1
  `);

  let nextSequence = 1;
  if (lastPO && lastPO.po_number && lastPO.po_number.startsWith('PO')) {
    const lastSequence = parseInt(lastPO.po_number.replace('PO', ''), 10);
    if (!isNaN(lastSequence)) {
      nextSequence = lastSequence + 1;
    }
  }

  // Format as PO + 3 digits, e.g., PO001
  return `PO${String(nextSequence).padStart(3, '0')}`;
}

// GET /api/purchase-orders
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    
    let query = `
      SELECT id, po_number, po_date, company_name, vendor_name, status, created_at 
      FROM purchase_orders 
    `;
    const params = [];

    if (req.user && req.user.vendorId) {
      query += ` WHERE vendor_id = ? `;
      params.push(req.user.vendorId);
    }
    
    query += ` ORDER BY created_at DESC `;
    
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

// POST /api/purchase-orders
router.post('/', async (req, res) => {
  if (req.user.role !== 'admin') {
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
        po_number, po_date, company_name, company_address, company_gstin,
        vendor_id, vendor_name, vendor_address, vendor_gstin, vendor_pan,
        delivery_same_as_company, delivery_address, delivery_city, delivery_state,
        delivery_pincode, delivery_contact_person, delivery_phone,
        terms_and_conditions, total_amount, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      po_number, po_date, company_name, company_address, company_gstin,
      vendor_id, vendor_name, vendor_address, vendor_gstin, vendor_pan,
      delivery_same_as_company ? 1 : 0, delivery_address, delivery_city, delivery_state,
      delivery_pincode, delivery_contact_person, delivery_phone,
      terms_and_conditions, total_amount, poStatus
    ]);

    const poId = result.lastID;

    // Insert items if provided
    if (items && items.length > 0) {
      for (const item of items) {
        await db.run(`
          INSERT INTO purchase_order_items (
            purchase_order_id, line_number, particulars, quantity, rate, value
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          poId, item.sl_no, item.particulars, item.quantity, item.rate, item.value
        ]);
      }
    }

    await db.run('COMMIT');

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
  if (req.user.role !== 'admin') {
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

    await db.run('BEGIN TRANSACTION');

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
      delivery_same_as_company ? 1 : 0, delivery_address, delivery_city, delivery_state,
      delivery_pincode, delivery_contact_person, delivery_phone,
      terms_and_conditions, total_amount, status,
      poId
    ]);

    // Delete existing items
    await db.run('DELETE FROM purchase_order_items WHERE purchase_order_id = ?', [poId]);

    // Insert new items if provided
    if (items && items.length > 0) {
      for (const item of items) {
        await db.run(`
          INSERT INTO purchase_order_items (
            purchase_order_id, line_number, particulars, quantity, rate, value
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          poId, item.sl_no, item.particulars, item.quantity, item.rate, item.value
        ]);
      }
    }

    await db.run('COMMIT');

    res.json({ success: true });
  } catch (error) {
    const db = await getDb();
    await db.run('ROLLBACK');
    console.error('Error updating purchase order:', error);
    res.status(500).json({ error: 'Failed to update purchase order' });
  }
});

export default router;

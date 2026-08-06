import express from 'express';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/permissions.js';
import { sendPOCreatedEmail } from '../utils/mailer.js';
import { getDb, pool, convertQuery, generateSequence } from '../config/db.js';
import { isSuperAdmin, tenantWhere, tenantAnd, getAuditUserId, getTenantId } from '../utils/tenantQuery.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/purchase-orders
router.get('/', authorize(PERMISSIONS.PO_VIEW), async (req, res) => {
  try {
    const db = await getDb();
    const { andClause: poAnd, params: tenantParams } = tenantAnd(req.user, 'po');
    const params = [...tenantParams];
    
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
      WHERE po.is_latest_revision = TRUE${poAnd}
    `;

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
router.get('/:id', authorize(PERMISSIONS.PO_VIEW), async (req, res) => {
  try {
    const db = await getDb();
    const { andClause, params: tenantParams } = tenantAnd(req.user);
    const params = [req.params.id, ...tenantParams];

    let query = `SELECT * FROM purchase_orders WHERE id = ?${andClause}`;

    if (req.user && req.user.vendorId) {
      query += ' AND vendor_id = ?';
      params.push(req.user.vendorId);
    }

    const po = await db.get(query, params);
    
    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }
    
    // Fetch associated items with previously invoiced quantities
    const { andClause: poiAnd, params: poiParams } = tenantAnd(req.user, 'poi');
    const itemParams = [req.params.id, ...poiParams];

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
      WHERE poi.purchase_order_id = ?${poiAnd}
      ORDER BY poi.line_number ASC
    `, itemParams);
    
    po.items = items || [];
    
    res.json(po);
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({ error: 'Failed to fetch purchase order' });
  }
});

// GET /api/purchase-orders/:id/revisions
router.get('/:id/revisions', authorize(PERMISSIONS.PO_VIEW), async (req, res) => {
  try {
    const db = await getDb();
    const { andClause, params: tenantParams } = tenantAnd(req.user);
    const initialParams = [req.params.id, ...tenantParams];

    // First find the base_po_number for this ID
    const po = await db.get(`SELECT po_number, base_po_number FROM purchase_orders WHERE id = ?${andClause}`, initialParams);
    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }
    
    const baseNumber = po.base_po_number || po.po_number;
    const params = [baseNumber, baseNumber, ...tenantParams];

    let query = `
      SELECT id, po_number, revision_number, is_latest_revision, status, created_at as edited_at, po_date
      FROM purchase_orders 
      WHERE (base_po_number = ? OR po_number = ?)${andClause}
    `;

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
router.post('/', authorize(PERMISSIONS.PO_CREATE), async (req, res) => {
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

    let targetTenantId = getTenantId(req.user);

    if (!targetTenantId) {
      if (!vendor_id) {
        return res.status(400).json({ error: 'Vendor must be selected to determine tenant context.' });
      }
      const vendor = await db.get('SELECT tenant_id FROM vendors WHERE id = ?', [vendor_id]);
      if (!vendor) {
         return res.status(404).json({ error: 'Selected vendor not found' });
      }
      targetTenantId = vendor.tenant_id;
    }

    const poStatus = status || 'Draft';

    let po_number;
    let poId;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      po_number = await generateSequence(client, targetTenantId, 'poConfig', 'PO-');

      const result = await client.query(convertQuery(`
        INSERT INTO purchase_orders (
          tenant_id, po_number, base_po_number, revision_number, is_latest_revision,
          po_date, company_name, company_address, company_gstin,
          vendor_id, vendor_name, vendor_address, vendor_gstin, vendor_pan,
          delivery_same_as_company, delivery_address, delivery_city, delivery_state,
          delivery_pincode, delivery_contact_person, delivery_phone,
          terms_and_conditions, total_amount, status
        ) VALUES (?, ?, ?, 0, TRUE, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
      `), [
        targetTenantId, po_number, po_number, po_date, company_name, company_address, company_gstin,
        vendor_id, vendor_name, vendor_address, vendor_gstin, vendor_pan,
        !!delivery_same_as_company, delivery_address, delivery_city, delivery_state,
        delivery_pincode, delivery_contact_person, delivery_phone,
        terms_and_conditions, total_amount, poStatus
      ]);

      poId = result.rows[0].id;

      const auditUserId = getAuditUserId(req.user);
      await client.query(convertQuery(`
        INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, new_values)
        VALUES (?, ?, ?, 'PurchaseOrder', ?, ?)
      `), [targetTenantId, auditUserId, `Created Purchase Order ${po_number}`, poId, JSON.stringify({ status: poStatus })]);

      // Insert items if provided
      if (items && items.length > 0) {
        const validItems = items.filter(i => i.particulars && i.quantity && i.rate);
        for (const item of validItems) {
          await client.query(convertQuery(`
            INSERT INTO purchase_order_items (
              tenant_id, purchase_order_id, line_number, particulars, quantity, rate, value
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `), [
            targetTenantId,
            poId, 
            item.sl_no, 
            item.particulars, 
            Number(item.quantity) || 0, 
            Number(item.rate) || 0, 
            Number(item.value) || 0
          ]);
        }
      }

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    // Send email notification to vendor
    if (vendor_id) {
      try {
        const v = await db.get('SELECT email, company_name FROM vendors WHERE id = ? AND tenant_id = ?', [vendor_id, targetTenantId]);
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
    console.error('Error creating purchase order:', error);
    res.status(500).json({ error: 'Failed to create purchase order: ' + (error.message || 'Unknown database error') });
  }
});

// PUT /api/purchase-orders/:id
router.put('/:id', authorize(PERMISSIONS.PO_EDIT), async (req, res) => {
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
    const { andClause, params: tenantParams } = tenantAnd(req.user);
    const paramsApp = [poId, ...tenantParams];

    const existingPo = await db.get(`SELECT * FROM purchase_orders WHERE id = ?${andClause}`, paramsApp);
    if (!existingPo) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    const targetTenantId = existingPo.tenant_id;

    if (existingPo.is_latest_revision === 0 || existingPo.is_latest_revision === false) {
      return res.status(400).json({ error: 'Cannot edit a historical revision. Only the latest revision can be edited.' });
    }

    let newPoId = poId;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const auditUserId = getAuditUserId(req.user);

      if (existingPo.status !== 'Draft') {
        // Create a new revision
        const basePoNumber = existingPo.base_po_number || existingPo.po_number;
        const newRevisionNumber = (existingPo.revision_number || 0) + 1;
        const newPoNumber = `${basePoNumber}/${String(newRevisionNumber).padStart(2, '0')}`;

        // Mark current as not latest
        await client.query(convertQuery('UPDATE purchase_orders SET is_latest_revision = FALSE WHERE id = ? AND tenant_id = ?'), [poId, targetTenantId]);

        await client.query(convertQuery(`
          INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, new_values)
          VALUES (?, ?, ?, 'PurchaseOrder', ?, ?)
        `), [targetTenantId, auditUserId, `Created Revision ${newPoNumber} from ${basePoNumber}`, poId, JSON.stringify({ revision_number: newRevisionNumber })]);

        const result = await client.query(convertQuery(`
          INSERT INTO purchase_orders (
            tenant_id, po_number, base_po_number, revision_number, parent_po_id, is_latest_revision,
            po_date, company_name, company_address, company_gstin,
            vendor_id, vendor_name, vendor_address, vendor_gstin, vendor_pan,
            delivery_same_as_company, delivery_address, delivery_city, delivery_state,
            delivery_pincode, delivery_contact_person, delivery_phone,
            terms_and_conditions, total_amount, status, created_at
          ) VALUES (?, ?, ?, ?, ?, TRUE, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) RETURNING id
        `), [
          targetTenantId, newPoNumber, basePoNumber, newRevisionNumber, poId,
          po_date, company_name, company_address, company_gstin,
          vendor_id, vendor_name, vendor_address, vendor_gstin, vendor_pan,
          !!delivery_same_as_company, delivery_address, delivery_city, delivery_state,
          delivery_pincode, delivery_contact_person, delivery_phone,
          terms_and_conditions, total_amount, status || 'Draft'
        ]);
        
        newPoId = result.rows[0].id;
      } else {
        // Update in place for Drafts
        await client.query(convertQuery(`
          UPDATE purchase_orders SET
            po_date = ?, company_name = ?, company_address = ?, company_gstin = ?,
            vendor_id = ?, vendor_name = ?, vendor_address = ?, vendor_gstin = ?, vendor_pan = ?,
            delivery_same_as_company = ?, delivery_address = ?, delivery_city = ?, delivery_state = ?,
            delivery_pincode = ?, delivery_contact_person = ?, delivery_phone = ?,
            terms_and_conditions = ?, total_amount = ?, status = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND tenant_id = ?
        `), [
          po_date, company_name, company_address, company_gstin,
          vendor_id, vendor_name, vendor_address, vendor_gstin, vendor_pan,
          !!delivery_same_as_company, delivery_address, delivery_city, delivery_state,
          delivery_pincode, delivery_contact_person, delivery_phone,
          terms_and_conditions, total_amount, status,
          poId, targetTenantId
        ]);
        
        await client.query(convertQuery(`
          INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, old_values, new_values)
          VALUES (?, ?, ?, 'PurchaseOrder', ?, ?, ?)
        `), [targetTenantId, auditUserId, `Updated Purchase Order ${existingPo.po_number}`, poId, JSON.stringify({ status: existingPo.status }), JSON.stringify({ status })]);
        
        // Delete existing items for in-place update
        await client.query(convertQuery('DELETE FROM purchase_order_items WHERE purchase_order_id = ? AND tenant_id = ?'), [poId, targetTenantId]);
      }

      // Insert new items for the correct PO ID (new or existing)
      if (items && items.length > 0) {
        const validItems = items.filter(i => i.particulars && i.quantity && i.rate);
        for (const item of validItems) {
          await client.query(convertQuery(`
            INSERT INTO purchase_order_items (
              tenant_id, purchase_order_id, line_number, particulars, quantity, rate, value
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `), [
            targetTenantId,
            newPoId, 
            item.sl_no || item.line_number, 
            item.particulars, 
            Number(item.quantity) || 0, 
            Number(item.rate) || 0, 
            Number(item.value) || 0
          ]);
        }
      }

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    // If a new revision was created (or status changed to Accepted/Issued), send email notification
    if (existingPo.status !== 'Draft' && status !== 'Draft' && vendor_id) {
      try {
        const v = await db.get('SELECT email, company_name FROM vendors WHERE id = ? AND tenant_id = ?', [vendor_id, targetTenantId]);
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
    console.error('Error updating purchase order:', error);
    res.status(500).json({ error: 'Failed to update purchase order' });
  }
});

export default router;

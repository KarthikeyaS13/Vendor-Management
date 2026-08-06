import express from 'express';
import { getDb } from '../config/db.js';
import { PERMISSIONS } from '../config/permissions.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { tenantWhere } from '../utils/tenantQuery.js';

const router = express.Router();

router.use(authenticateToken);

// POST /api/reports/vendors
router.post('/vendors', authorize(PERMISSIONS.REPORTS_VIEW), async (req, res) => {
  try {
    const db = await getDb();
    const { status, category, dateFrom, dateTo } = req.body;
    const { whereClause, params } = tenantWhere(req.user);

    let query = `
      SELECT id, vendor_code, company_name, contact_person, email, industry, status, created_at
      FROM vendors
      ${whereClause}
    `;

    if (status) {
      query += whereClause ? ' AND status = ?' : ' WHERE status = ?';
      params.push(status);
    }
    if (category) {
      query += (whereClause || status) ? ' AND industry = ?' : ' WHERE industry = ?';
      params.push(category);
    }
    if (dateFrom) {
      query += (whereClause || status || category) ? ' AND created_at >= ?' : ' WHERE created_at >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += (whereClause || status || category || dateFrom) ? ' AND created_at <= ?' : ' WHERE created_at <= ?';
      params.push(dateTo);
    }

    query += ' ORDER BY created_at DESC';

    const data = await db.all(query, params);
    res.json(data);
  } catch (error) {
    console.error('Error generating vendors report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// POST /api/reports/purchase-orders
router.post('/purchase-orders', authorize(PERMISSIONS.REPORTS_VIEW), async (req, res) => {
  try {
    const db = await getDb();
    const { status, vendorId, dateFrom, dateTo } = req.body;
    const { whereClause, params } = tenantWhere(req.user);

    let query = `
      SELECT id, po_number, po_date, vendor_name, total_amount, status, created_at
      FROM purchase_orders
      ${whereClause ? whereClause + ' AND is_latest_revision = TRUE' : ' WHERE is_latest_revision = TRUE'}
    `;

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (vendorId) {
      query += ' AND vendor_id = ?';
      params.push(vendorId);
    }
    if (dateFrom) {
      query += ' AND po_date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND po_date <= ?';
      params.push(dateTo);
    }

    query += ' ORDER BY po_date DESC';

    const data = await db.all(query, params);
    res.json(data);
  } catch (error) {
    console.error('Error generating POs report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// POST /api/reports/invoices
router.post('/invoices', authorize(PERMISSIONS.REPORTS_VIEW), async (req, res) => {
  try {
    const db = await getDb();
    const { status, vendorId, dateFrom, dateTo } = req.body;
    const { whereClause, params } = tenantWhere(req.user, 'i');

    let query = `
      SELECT i.id, i.invoice_number, i.invoice_date, v.company_name as vendor_name, i.grand_total, i.status, i.created_at
      FROM purchase_invoices i
      JOIN vendors v ON i.vendor_id = v.id
      ${whereClause}
    `;

    if (status) {
      query += whereClause ? ' AND i.status = ?' : ' WHERE i.status = ?';
      params.push(status);
    }
    if (vendorId) {
      query += (whereClause || status) ? ' AND i.vendor_id = ?' : ' WHERE i.vendor_id = ?';
      params.push(vendorId);
    }
    if (dateFrom) {
      query += (whereClause || status || vendorId) ? ' AND i.invoice_date >= ?' : ' WHERE i.invoice_date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += (whereClause || status || vendorId || dateFrom) ? ' AND i.invoice_date <= ?' : ' WHERE i.invoice_date <= ?';
      params.push(dateTo);
    }

    query += ' ORDER BY i.invoice_date DESC';

    const data = await db.all(query, params);
    res.json(data);
  } catch (error) {
    console.error('Error generating Invoices report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;

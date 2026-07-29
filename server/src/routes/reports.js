import express from 'express';
import { getDb } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Middleware to prevent vendor access to reports (or handle them carefully if vendors need basic reports)
const requireAdmin = (req, res, next) => {
  if (req.user.role === 'VENDOR' || req.user.role === 'vendor') {
    return res.status(403).json({ error: 'Access denied. Reports are for internal staff only.' });
  }
  next();
};

// POST /api/reports/vendors
router.post('/vendors', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const tenantId = req.user.tenantId;
    const { status, category, dateFrom, dateTo } = req.body;

    let query = `
      SELECT id, vendor_code, company_name, contact_person, email, industry, status, created_at
      FROM vendors
      WHERE tenant_id = $1
    `;
    const params = [tenantId];
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    if (category) {
      query += ` AND industry = $${paramIndex++}`;
      params.push(category);
    }
    if (dateFrom) {
      query += ` AND created_at >= $${paramIndex++}`;
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ` AND created_at <= $${paramIndex++}`;
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
router.post('/purchase-orders', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const tenantId = req.user.tenantId;
    const { status, vendorId, dateFrom, dateTo } = req.body;

    let query = `
      SELECT id, po_number, po_date, vendor_name, total_amount, status, created_at
      FROM purchase_orders
      WHERE tenant_id = $1 AND is_latest_revision = TRUE
    `;
    const params = [tenantId];
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    if (vendorId) {
      query += ` AND vendor_id = $${paramIndex++}`;
      params.push(vendorId);
    }
    if (dateFrom) {
      query += ` AND po_date >= $${paramIndex++}`;
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ` AND po_date <= $${paramIndex++}`;
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
router.post('/invoices', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const tenantId = req.user.tenantId;
    const { status, vendorId, dateFrom, dateTo } = req.body;

    let query = `
      SELECT i.id, i.invoice_number, i.invoice_date, v.company_name as vendor_name, i.grand_total, i.status, i.created_at
      FROM purchase_invoices i
      JOIN vendors v ON i.vendor_id = v.id
      WHERE i.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIndex = 2;

    if (status) {
      query += ` AND i.status = $${paramIndex++}`;
      params.push(status);
    }
    if (vendorId) {
      query += ` AND i.vendor_id = $${paramIndex++}`;
      params.push(vendorId);
    }
    if (dateFrom) {
      query += ` AND i.invoice_date >= $${paramIndex++}`;
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ` AND i.invoice_date <= $${paramIndex++}`;
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

import express from 'express';
import { getDb } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Middleware to prevent vendor access to tenant-wide analytics
const requireAdmin = (req, res, next) => {
  if (req.user.role === 'VENDOR' || req.user.role === 'vendor') {
    return res.status(403).json({ error: 'Access denied. Tenant analytics are for internal staff only.' });
  }
  next();
};

// GET /api/analytics/averages
router.get('/averages', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const tenantId = req.user.tenantId;

    const result = await db.get(`
      SELECT 
        AVG(total_amount) as avg_po_value,
        (SELECT AVG(grand_total) FROM purchase_invoices WHERE tenant_id = $1 AND status != 'Rejected') as avg_invoice_value,
        (SELECT AVG(grand_total) FROM purchase_invoices WHERE tenant_id = $1 AND status = 'Paid') as avg_payment_value
      FROM purchase_orders 
      WHERE tenant_id = $1 AND is_latest_revision = TRUE
    `, [tenantId]);

    res.json(result);
  } catch (error) {
    console.error('Error fetching averages:', error);
    res.status(500).json({ error: 'Failed to fetch analytics averages' });
  }
});

// GET /api/analytics/vendor-utilization
router.get('/vendor-utilization', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const tenantId = req.user.tenantId;

    // Vendors with at least 1 PO
    const activeVendors = await db.get(`
      SELECT COUNT(DISTINCT vendor_id) as active_count
      FROM purchase_orders
      WHERE tenant_id = $1
    `, [tenantId]);

    const totalVendors = await db.get(`
      SELECT COUNT(*) as total_count
      FROM vendors
      WHERE tenant_id = $1 AND status = 'Active'
    `, [tenantId]);

    // Repeat vendors (vendors with >1 PO)
    const repeatVendors = await db.get(`
      SELECT COUNT(*) as repeat_count
      FROM (
        SELECT vendor_id 
        FROM purchase_orders 
        WHERE tenant_id = $1 AND is_latest_revision = TRUE
        GROUP BY vendor_id 
        HAVING COUNT(id) > 1
      ) as sub
    `, [tenantId]);

    res.json({
      activeVendors: activeVendors.active_count || 0,
      totalVendors: totalVendors.total_count || 0,
      repeatVendors: repeatVendors.repeat_count || 0,
      utilizationPercentage: totalVendors.total_count ? ((activeVendors.active_count / totalVendors.total_count) * 100).toFixed(2) : 0,
      repeatPercentage: activeVendors.active_count ? ((repeatVendors.repeat_count / activeVendors.active_count) * 100).toFixed(2) : 0
    });
  } catch (error) {
    console.error('Error fetching vendor utilization:', error);
    res.status(500).json({ error: 'Failed to fetch vendor utilization' });
  }
});

// GET /api/analytics/top-vendors
router.get('/top-vendors', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const tenantId = req.user.tenantId;

    const topVendors = await db.all(`
      SELECT 
        v.company_name, 
        SUM(p.total_amount) as total_spend,
        COUNT(p.id) as po_count
      FROM vendors v
      JOIN purchase_orders p ON v.id = p.vendor_id
      WHERE p.tenant_id = $1 AND p.is_latest_revision = TRUE
      GROUP BY v.id, v.company_name
      ORDER BY total_spend DESC
      LIMIT 10
    `, [tenantId]);

    res.json(topVendors);
  } catch (error) {
    console.error('Error fetching top vendors:', error);
    res.status(500).json({ error: 'Failed to fetch top vendors' });
  }
});

// GET /api/analytics/top-categories
router.get('/top-categories', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const tenantId = req.user.tenantId;

    const topCategories = await db.all(`
      SELECT 
        COALESCE(v.industry, 'Uncategorized') as category,
        SUM(p.total_amount) as total_spend
      FROM vendors v
      JOIN purchase_orders p ON v.id = p.vendor_id
      WHERE p.tenant_id = $1 AND p.is_latest_revision = TRUE
      GROUP BY v.industry
      ORDER BY total_spend DESC
      LIMIT 10
    `, [tenantId]);

    res.json(topCategories);
  } catch (error) {
    console.error('Error fetching top categories:', error);
    res.status(500).json({ error: 'Failed to fetch top categories' });
  }
});

// GET /api/analytics/cycle-times
router.get('/cycle-times', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const tenantId = req.user.tenantId;

    // Approximation of payment cycle time (Invoice Date to Paid Date)
    const cycleTime = await db.get(`
      SELECT 
        AVG(EXTRACT(DAY FROM (paid_at - created_at))) as avg_payment_days
      FROM purchase_invoices
      WHERE tenant_id = $1 AND status = 'Paid' AND paid_at IS NOT NULL
    `, [tenantId]);

    res.json({
      averagePaymentDays: cycleTime.avg_payment_days ? parseFloat(cycleTime.avg_payment_days).toFixed(1) : 0
    });
  } catch (error) {
    console.error('Error fetching cycle times:', error);
    res.status(500).json({ error: 'Failed to fetch cycle times' });
  }
});

export default router;

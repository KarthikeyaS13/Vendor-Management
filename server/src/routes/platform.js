import express from 'express';
import { getDb } from '../config/db.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireSuperAdmin);

/**
 * GET /api/platform/stats
 * Aggregated statistics for the Super Admin platform dashboard
 */
router.get('/stats', async (req, res) => {
  try {
    const db = await getDb();

    // 1. Tenant Overview
    const tenantCounts = await db.get(`
      SELECT 
        COUNT(*) as total_tenants,
        COUNT(CASE WHEN status = 'ACTIVE' AND is_deleted IS NOT TRUE THEN 1 END) as active_tenants,
        COUNT(CASE WHEN status = 'SUSPENDED' AND is_deleted IS NOT TRUE THEN 1 END) as suspended_tenants,
        COUNT(CASE WHEN subscription_plan = 'Enterprise' AND is_deleted IS NOT TRUE THEN 1 END) as enterprise_tenants,
        COUNT(CASE WHEN subscription_plan = 'Professional' AND is_deleted IS NOT TRUE THEN 1 END) as pro_tenants,
        COUNT(CASE WHEN subscription_plan = 'Starter' OR subscription_plan IS NULL THEN 1 END) as starter_tenants
      FROM tenants
      WHERE is_deleted IS NOT TRUE
    `);

    // 2. Global Entity Counts
    const entityCounts = await db.get(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role != 'SUPER_ADMIN') as total_users,
        (SELECT COUNT(*) FROM vendors) as total_vendors,
        (SELECT COUNT(*) FROM purchase_orders WHERE is_latest_revision = TRUE) as total_pos,
        (SELECT COUNT(*) FROM purchase_invoices) as total_invoices,
        (SELECT COALESCE(SUM(grand_total), 0) FROM purchase_invoices WHERE status = 'Paid') as total_platform_spend
    `);

    // 3. Recent Tenants
    const recentTenants = await db.all(`
      SELECT 
        t.id, t.company_name, t.company_code, t.subscription_plan, t.status, t.created_at,
        (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as users_count,
        (SELECT COUNT(*) FROM vendors v WHERE v.tenant_id = t.id) as vendors_count
      FROM tenants t
      WHERE t.is_deleted IS NOT TRUE
      ORDER BY t.created_at DESC
      LIMIT 5
    `);

    // 4. Recent Audit Logs
    const recentAudits = await db.all(`
      SELECT 
        a.id, a.action, a.details, a.entity_type, a.entity_id, a.created_at,
        t.company_name as tenant_name,
        u.username as user_name
      FROM audit_logs a
      LEFT JOIN tenants t ON a.tenant_id = t.id
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      stats: {
        totalTenants: parseInt(tenantCounts?.total_tenants, 10) || 0,
        activeTenants: parseInt(tenantCounts?.active_tenants, 10) || 0,
        suspendedTenants: parseInt(tenantCounts?.suspended_tenants, 10) || 0,
        plans: {
          enterprise: parseInt(tenantCounts?.enterprise_tenants, 10) || 0,
          professional: parseInt(tenantCounts?.pro_tenants, 10) || 0,
          starter: parseInt(tenantCounts?.starter_tenants, 10) || 0
        },
        totalUsers: parseInt(entityCounts?.total_users, 10) || 0,
        totalVendors: parseInt(entityCounts?.total_vendors, 10) || 0,
        totalPOs: parseInt(entityCounts?.total_pos, 10) || 0,
        totalInvoices: parseInt(entityCounts?.total_invoices, 10) || 0,
        totalPlatformSpend: parseFloat(entityCounts?.total_platform_spend) || 0
      },
      recentTenants: (recentTenants || []).map(t => ({
        ...t,
        users_count: parseInt(t.users_count, 10) || 0,
        vendors_count: parseInt(t.vendors_count, 10) || 0
      })),
      recentAudits: recentAudits || []
    });
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch platform stats' });
  }
});

/**
 * GET /api/platform/audit-logs
 * Fetch all platform audit logs
 */
router.get('/audit-logs', async (req, res) => {
  try {
    const db = await getDb();
    const { tenantId, action, search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        a.id, a.action, a.details, a.entity_type, a.entity_id, a.created_at,
        t.company_name as tenant_name,
        t.company_code as tenant_code,
        u.username as user_name,
        u.email as user_email
      FROM audit_logs a
      LEFT JOIN tenants t ON a.tenant_id = t.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (tenantId) {
      query += ` AND a.tenant_id = ?`;
      params.push(tenantId);
    }
    if (action) {
      query += ` AND a.action = ?`;
      params.push(action);
    }
    if (search) {
      query += ` AND (a.details LIKE ? OR u.username LIKE ? OR t.company_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const logs = await db.all(query, params);
    res.json({ success: true, logs: logs || [] });
  } catch (error) {
    console.error('Error fetching platform audit logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
});

export default router;

import express from 'express';
import { getDb } from '../config/db.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/permissions.js';
import { isSuperAdmin, tenantWhere, tenantAnd, getTenantCondition } from '../utils/tenantQuery.js';

const router = express.Router();

router.use(authenticateToken);

// GET /api/dashboard/kpis
router.get('/kpis', authorize([PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.VENDOR_DASHBOARD_VIEW]), async (req, res) => {
  try {
    const db = await getDb();
    const { ROLE_CONFIG } = await import('../config/roles.js');
    const isVendor = ROLE_CONFIG[req.user.role]?.dashboard === 'vendor';
    const vendorId = req.user.vendorId;

    let kpis = {};

    if (isVendor && vendorId) {
      // Vendor KPIs
      const { andClause, params: tenantParams } = tenantAnd(req.user);
      const poStats = await db.get(`
        SELECT 
          COUNT(*) as total_pos,
          COUNT(CASE WHEN status = 'Issued' THEN 1 END) as issued_pos
        FROM purchase_orders 
        WHERE is_latest_revision = TRUE AND vendor_id = ?${andClause}
      `, [vendorId, ...tenantParams]);

      const invoiceStats = await db.get(`
        SELECT 
          COUNT(*) as total_invoices,
          COUNT(CASE WHEN status = 'Paid' THEN 1 END) as paid_invoices,
          SUM(grand_total) as total_invoice_value,
          SUM(CASE WHEN status = 'Paid' THEN grand_total ELSE 0 END) as total_paid_value,
          SUM(CASE WHEN status != 'Paid' AND status != 'Rejected' THEN grand_total ELSE 0 END) as outstanding_value
        FROM purchase_invoices 
        WHERE vendor_id = ?${andClause}
      `, [vendorId, ...tenantParams]);

      kpis = {
        purchaseOrders: poStats?.total_pos || 0,
        issuedPurchaseOrders: poStats?.issued_pos || 0,
        totalInvoiceValue: invoiceStats?.total_invoice_value || 0,
        pendingInvoices: (invoiceStats?.total_invoices || 0) - (invoiceStats?.paid_invoices || 0),
        paidInvoices: invoiceStats?.paid_invoices || 0,
        outstandingAmount: invoiceStats?.outstanding_value || 0,
      };
    } else {
      // Admin / Tenant-wide / Platform KPIs
      const { whereClause: vWhere, params: vParams } = tenantWhere(req.user);
      const vendorStats = await db.get(`
        SELECT 
          COUNT(*) as total_vendors,
          COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_vendors
        FROM vendors${vWhere}
      `, vParams);

      const { andClause: appAnd, params: appParams } = tenantAnd(req.user);
      const appStats = await db.get(`
        SELECT COUNT(*) as pending_apps
        FROM vendor_applications WHERE status IN ('SUBMITTED', 'IN_REVIEW')${appAnd}
      `, appParams);

      const { andClause: poAnd, params: poParams } = tenantAnd(req.user);
      const poStats = await db.get(`
        SELECT 
          COUNT(*) as total_pos,
          COUNT(CASE WHEN status = 'Draft' THEN 1 END) as draft_pos,
          COUNT(CASE WHEN status = 'Issued' THEN 1 END) as issued_pos
        FROM purchase_orders WHERE is_latest_revision = TRUE${poAnd}
      `, poParams);

      const { whereClause: invWhere, params: invParams } = tenantWhere(req.user);
      const invoiceStats = await db.get(`
        SELECT 
          SUM(grand_total) as total_invoice_value,
          COUNT(CASE WHEN status = 'Submitted' OR status = 'Under Review' THEN 1 END) as pending_invoices,
          COUNT(CASE WHEN status = 'Accepted' OR status = 'Ready for Payment' THEN 1 END) as accepted_invoices,
          COUNT(CASE WHEN status = 'Paid' THEN 1 END) as paid_invoices,
          SUM(CASE WHEN status != 'Paid' AND status != 'Rejected' THEN grand_total ELSE 0 END) as outstanding_amount,
          SUM(CASE WHEN status = 'Paid' THEN grand_total ELSE 0 END) as total_payments
        FROM purchase_invoices${invWhere}
      `, invParams);

      const { andClause: paidAnd, params: paidParams } = tenantAnd(req.user);
      const currentMonthSpend = await db.get(`
        SELECT SUM(grand_total) as spend
        FROM purchase_invoices
        WHERE status = 'Paid' 
          AND paid_at >= date_trunc('month', CURRENT_DATE)${paidAnd}
      `, paidParams);

      const currentYearSpend = await db.get(`
        SELECT SUM(grand_total) as spend
        FROM purchase_invoices
        WHERE status = 'Paid' 
          AND paid_at >= date_trunc('year', CURRENT_DATE)${paidAnd}
      `, paidParams);

      kpis = {
        totalVendors: vendorStats?.total_vendors || 0,
        activeVendors: vendorStats?.active_vendors || 0,
        pendingVendorApplications: appStats?.pending_apps || 0,
        purchaseOrders: poStats?.total_pos || 0,
        draftPurchaseOrders: poStats?.draft_pos || 0,
        issuedPurchaseOrders: poStats?.issued_pos || 0,
        totalInvoiceValue: invoiceStats?.total_invoice_value || 0,
        pendingInvoices: invoiceStats?.pending_invoices || 0,
        acceptedInvoices: invoiceStats?.accepted_invoices || 0,
        paidInvoices: invoiceStats?.paid_invoices || 0,
        outstandingAmount: invoiceStats?.outstanding_amount || 0,
        thisMonthSpend: currentMonthSpend?.spend || 0,
        thisYearSpend: currentYearSpend?.spend || 0,
        totalPayments: invoiceStats?.total_payments || 0
      };
    }

    res.json(kpis);
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({ error: 'Failed to fetch KPIs' });
  }
});

// GET /api/dashboard/charts
router.get('/charts', authorize([PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.VENDOR_DASHBOARD_VIEW]), async (req, res) => {
  try {
    const db = await getDb();
    const { ROLE_CONFIG } = await import('../config/roles.js');
    const isVendor = ROLE_CONFIG[req.user.role]?.dashboard === 'vendor';
    const vendorId = req.user.vendorId;

    const { andClause, params: tenantParams } = tenantAnd(req.user);

    let vendorFilter = '';
    let extraParams = [];

    if (isVendor && vendorId) {
      vendorFilter = ' AND vendor_id = ? ';
      extraParams.push(vendorId);
    }

    const queryParams = [...tenantParams, ...extraParams];

    // Monthly Spend (Last 6 months)
    const monthlySpend = await db.all(`
      SELECT 
        to_char(date_trunc('month', created_at), 'Mon YYYY') as month,
        SUM(grand_total) as spend
      FROM purchase_invoices
      WHERE created_at >= current_date - interval '6 months'${andClause}${vendorFilter}
      GROUP BY date_trunc('month', created_at)
      ORDER BY date_trunc('month', created_at) ASC
    `, queryParams);

    // Invoice Status Distribution
    const invoiceStatus = await db.all(`
      SELECT status, COUNT(*) as count
      FROM purchase_invoices
      WHERE 1=1${andClause}${vendorFilter}
      GROUP BY status
    `, queryParams);

    // PO Status Distribution
    const poStatus = await db.all(`
      SELECT status, COUNT(*) as count
      FROM purchase_orders
      WHERE is_latest_revision = TRUE${andClause}${vendorFilter}
      GROUP BY status
    `, queryParams);

    res.json({
      monthlySpend,
      invoiceStatus,
      poStatus
    });
  } catch (error) {
    console.error('Error fetching charts:', error);
    res.status(500).json({ error: 'Failed to fetch charts' });
  }
});

// GET /api/dashboard/activity
router.get('/activity', authorize([PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.VENDOR_DASHBOARD_VIEW]), async (req, res) => {
  try {
    const db = await getDb();
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    const { andClause, params: tenantParams } = tenantAnd(req.user);

    let query = `
      SELECT id, user_id, action, entity_type, entity_id, created_at
      FROM audit_logs
      WHERE 1=1${andClause}
    `;
    let params = [...tenantParams];

    const { ROLE_CONFIG } = await import('../config/roles.js');
    if (ROLE_CONFIG[req.user.role]?.dashboard === 'vendor') {
      const vendorId = req.user.vendorId;
      const pos = await db.all(`SELECT id FROM purchase_orders WHERE 1=1${andClause} AND vendor_id = ?`, [...tenantParams, vendorId]);
      const invs = await db.all(`SELECT id FROM purchase_invoices WHERE 1=1${andClause} AND vendor_id = ?`, [...tenantParams, vendorId]);
      
      const poIds = pos.map(p => p.id);
      const invIds = invs.map(i => i.id);
      
      if (poIds.length === 0 && invIds.length === 0) {
        return res.json([]);
      }
      
      const poIdsStr = poIds.join(',');
      const invIdsStr = invIds.join(',');
      
      query = `
        SELECT id, user_id, action, entity_type, entity_id, created_at
        FROM audit_logs
        WHERE 1=1${andClause}
        AND (
          (entity_type = 'PurchaseOrder' AND entity_id IN (${poIdsStr || '0'}))
          OR (entity_type = 'PurchaseInvoice' AND entity_id IN (${invIdsStr || '0'}))
        )
      `;
      params = [...tenantParams];
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const activity = await db.all(query, params);
    res.json(activity);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// GET /api/dashboard/activities (legacy alias)
router.get('/activities', authorize([PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.VENDOR_DASHBOARD_VIEW]), async (req, res) => {
  try {
    const db = await getDb();
    const { andClause, params: tenantParams } = tenantAnd(req.user);
    const activities = await db.all(`
      SELECT id, action as text, created_at as time
      FROM audit_logs
      WHERE 1=1${andClause}
      ORDER BY created_at DESC
      LIMIT 10
    `, tenantParams);

    const formattedActivities = activities.map(a => ({
      id: a.id.toString(),
      text: a.text,
      time: new Date(a.time).toLocaleString()
    }));

    res.json(formattedActivities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// GET /api/dashboard/stats (legacy alias)
router.get('/stats', authorize([PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.VENDOR_DASHBOARD_VIEW]), async (req, res) => {
  try {
    const db = await getDb();
    const { andClause, params: tenantParams } = tenantAnd(req.user);
    
    const totalVendors = await db.get(`SELECT COUNT(*) as count FROM vendors WHERE 1=1${andClause}`, tenantParams);
    const activeVendors = await db.get(`SELECT COUNT(*) as count FROM vendors WHERE status = 'Active'${andClause}`, tenantParams);
    const suspendedVendors = await db.get(`SELECT COUNT(*) as count FROM vendors WHERE status = 'Suspended'${andClause}`, tenantParams);
    const pendingQuery = await db.get(`SELECT COUNT(*) as count FROM vendor_applications WHERE status = 'IN_REVIEW'${andClause}`, tenantParams);

    res.json([
      { name: 'Total Vendors', value: totalVendors?.count || 0, icon: 'FileText', color: 'text-blue-600', bg: 'bg-blue-100' },
      { name: 'Active Vendors', value: activeVendors?.count || 0, icon: 'CheckCircle2', color: 'text-emerald-600', bg: 'bg-emerald-100' },
      { name: 'Suspended Vendors', value: suspendedVendors?.count || 0, icon: 'AlertCircle', color: 'text-amber-600', bg: 'bg-amber-100' },
      { name: 'Pending Approvals', value: pendingQuery?.count || 0, icon: 'Clock', color: 'text-purple-600', bg: 'bg-purple-100' }
    ]);
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/dashboard/queue
router.get('/queue', authorize([PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.VENDOR_DASHBOARD_VIEW]), async (req, res) => {
  try {
    const db = await getDb();
    const { andClause: aAnd, params: aParams } = tenantAnd(req.user, 'a');
    const queue = await db.all(`
      SELECT 
        a.application_number as id, 
        p.legal_name as name, 
        b.industry_category as category, 
        a.status, 
        a.submitted_at as submitted
      FROM vendor_applications a
      LEFT JOIN vendor_company_profiles p ON a.id = p.application_id
      LEFT JOIN vendor_business_profiles b ON a.id = b.application_id
      WHERE a.status = 'IN_REVIEW'${aAnd}
      ORDER BY a.submitted_at DESC
      LIMIT 10
    `, aParams);

    const formattedQueue = queue.map(q => ({
      ...q,
      submitted: q.submitted ? new Date(q.submitted).toLocaleDateString() : 'Unknown'
    }));

    res.json(formattedQueue);
  } catch (error) {
    console.error('Dashboard Queue Error:', error);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// GET /api/dashboard/system-metrics
router.get('/system-metrics', authorize([PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.VENDOR_DASHBOARD_VIEW]), async (req, res) => {
  try {
    const db = await getDb();
    const { andClause, params: tenantParams } = tenantAnd(req.user);
    
    const poCount = await db.get(`SELECT COUNT(*) as count FROM purchase_orders WHERE 1=1${andClause}`, tenantParams);
    const invoiceCount = await db.get(`SELECT COUNT(*) as count FROM purchase_invoices WHERE 1=1${andClause}`, tenantParams);
    const paymentSum = await db.get(`SELECT SUM(grand_total) as total FROM purchase_invoices WHERE status = 'Paid'${andClause}`, tenantParams);
    
    res.json([
      { label: 'Purchase Orders Issued', value: poCount?.count || 0 },
      { label: 'Invoices Received', value: invoiceCount?.count || 0 },
      { label: 'Total Payments Processed', value: paymentSum?.total ? `₹${Number(paymentSum.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00' }
    ]);
  } catch (error) {
    console.error('Dashboard System Metrics Error:', error);
    res.status(500).json({ error: 'Failed to fetch system metrics' });
  }
});

// GET /api/dashboard/notifications
router.get('/notifications', authorize([PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.VENDOR_DASHBOARD_VIEW]), async (req, res) => {
  try {
    const db = await getDb();
    const { ROLE_CONFIG } = await import('../config/roles.js');
    const isVendor = ROLE_CONFIG[req.user.role]?.dashboard === 'vendor';
    
    let notifications = [];

    if (isVendor) {
      const vendorId = req.user.vendorId;
      const { andClause, params: tenantParams } = tenantAnd(req.user);
      
      const unpaidInvs = await db.all(`
        SELECT id, invoice_number, status, updated_at
        FROM purchase_invoices
        WHERE status = 'Accepted' AND vendor_id = ?${andClause}
        ORDER BY updated_at DESC LIMIT 5
      `, [vendorId, ...tenantParams]);
      
      unpaidInvs.forEach(inv => {
        notifications.push({
          id: `inv-${inv.id}`,
          title: 'Invoice Accepted',
          message: `Invoice ${inv.invoice_number} is accepted and pending payment.`,
          type: 'success',
          created_at: inv.updated_at
        });
      });
      
    } else {
      // Admins: pending apps, pending invoices
      const { andClause: viAnd, params: viParams } = tenantAnd(req.user, 'vi');
      let appsQuery = `
        SELECT va.id, vi.companyName as company_name, va.created_at
        FROM vendor_applications va
        LEFT JOIN vendor_invitations vi ON va.invitation_id = vi.id
        WHERE va.status IN ('SUBMITTED', 'IN_REVIEW')${viAnd}
        ORDER BY va.created_at DESC LIMIT 5
      `;

      const pendingApps = await db.all(appsQuery, viParams);
      
      pendingApps.forEach(app => {
        notifications.push({
          id: `app-${app.id}`,
          title: 'Pending Vendor Application',
          message: `${app.company_name} applied for registration.`,
          type: 'warning',
          created_at: app.created_at
        });
      });
      
      const { andClause: invAnd, params: invParams } = tenantAnd(req.user);
      let invsQuery = `
        SELECT id, invoice_number, created_at
        FROM purchase_invoices
        WHERE status = 'Submitted'${invAnd}
        ORDER BY created_at DESC LIMIT 5
      `;

      const pendingInvs = await db.all(invsQuery, invParams);
      
      pendingInvs.forEach(inv => {
        notifications.push({
          id: `inv-${inv.id}`,
          title: 'Pending Invoice',
          message: `Invoice ${inv.invoice_number} requires review.`,
          type: 'info',
          created_at: inv.created_at
        });
      });
    }

    // Sort by created_at DESC
    notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      notifications: notifications.slice(0, 10),
      unreadCount: notifications.length
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

export default router;

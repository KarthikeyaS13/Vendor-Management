import express from 'express';
import { getDb } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// GET /api/dashboard/kpis
router.get('/kpis', async (req, res) => {
  try {
    const db = await getDb();
    const tenantId = req.user.tenantId;
    const isVendor = req.user.role === 'VENDOR' || req.user.role === 'vendor';
    const vendorId = req.user.vendorId;

    let kpis = {};

    if (isVendor && vendorId) {
      // Vendor KPIs
      const poStats = await db.get(`
        SELECT 
          COUNT(*) as total_pos,
          COUNT(CASE WHEN status = 'Issued' THEN 1 END) as issued_pos
        FROM purchase_orders 
        WHERE tenant_id = ? AND vendor_id = ? AND is_latest_revision = TRUE
      `, [tenantId, vendorId]);

      const invoiceStats = await db.get(`
        SELECT 
          COUNT(*) as total_invoices,
          COUNT(CASE WHEN status = 'Paid' THEN 1 END) as paid_invoices,
          SUM(grand_total) as total_invoice_value,
          SUM(CASE WHEN status = 'Paid' THEN grand_total ELSE 0 END) as total_paid_value,
          SUM(CASE WHEN status != 'Paid' AND status != 'Rejected' THEN grand_total ELSE 0 END) as outstanding_value
        FROM purchase_invoices 
        WHERE tenant_id = ? AND vendor_id = ?
      `, [tenantId, vendorId]);

      kpis = {
        purchaseOrders: poStats.total_pos || 0,
        issuedPurchaseOrders: poStats.issued_pos || 0,
        totalInvoiceValue: invoiceStats.total_invoice_value || 0,
        pendingInvoices: (invoiceStats.total_invoices || 0) - (invoiceStats.paid_invoices || 0),
        paidInvoices: invoiceStats.paid_invoices || 0,
        outstandingAmount: invoiceStats.outstanding_value || 0,
      };
    } else {
      // Admin / Tenant-wide KPIs
      const vendorStats = await db.get(`
        SELECT 
          COUNT(*) as total_vendors,
          COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_vendors
        FROM vendors WHERE tenant_id = ?
      `, [tenantId]);

      const appStats = await db.get(`
        SELECT COUNT(*) as pending_apps
        FROM vendor_applications WHERE tenant_id = ? AND status IN ('SUBMITTED', 'IN_REVIEW')
      `, [tenantId]);

      const poStats = await db.get(`
        SELECT 
          COUNT(*) as total_pos,
          COUNT(CASE WHEN status = 'Draft' THEN 1 END) as draft_pos,
          COUNT(CASE WHEN status = 'Issued' THEN 1 END) as issued_pos
        FROM purchase_orders WHERE tenant_id = ? AND is_latest_revision = TRUE
      `, [tenantId]);

      const invoiceStats = await db.get(`
        SELECT 
          SUM(grand_total) as total_invoice_value,
          COUNT(CASE WHEN status = 'Submitted' OR status = 'Under Review' THEN 1 END) as pending_invoices,
          COUNT(CASE WHEN status = 'Accepted' OR status = 'Ready for Payment' THEN 1 END) as accepted_invoices,
          COUNT(CASE WHEN status = 'Paid' THEN 1 END) as paid_invoices,
          SUM(CASE WHEN status != 'Paid' AND status != 'Rejected' THEN grand_total ELSE 0 END) as outstanding_amount,
          SUM(CASE WHEN status = 'Paid' THEN grand_total ELSE 0 END) as total_payments
        FROM purchase_invoices WHERE tenant_id = ?
      `, [tenantId]);

      const currentMonthSpend = await db.get(`
        SELECT SUM(grand_total) as spend
        FROM purchase_invoices
        WHERE tenant_id = ? AND status = 'Paid' 
          AND paid_at >= date_trunc('month', CURRENT_DATE)
      `, [tenantId]);

      const currentYearSpend = await db.get(`
        SELECT SUM(grand_total) as spend
        FROM purchase_invoices
        WHERE tenant_id = ? AND status = 'Paid' 
          AND paid_at >= date_trunc('year', CURRENT_DATE)
      `, [tenantId]);

      kpis = {
        totalVendors: vendorStats.total_vendors || 0,
        activeVendors: vendorStats.active_vendors || 0,
        pendingVendorApplications: appStats.pending_apps || 0,
        purchaseOrders: poStats.total_pos || 0,
        draftPurchaseOrders: poStats.draft_pos || 0,
        issuedPurchaseOrders: poStats.issued_pos || 0,
        totalInvoiceValue: invoiceStats.total_invoice_value || 0,
        pendingInvoices: invoiceStats.pending_invoices || 0,
        acceptedInvoices: invoiceStats.accepted_invoices || 0,
        paidInvoices: invoiceStats.paid_invoices || 0,
        outstandingAmount: invoiceStats.outstanding_amount || 0,
        thisMonthSpend: currentMonthSpend.spend || 0,
        thisYearSpend: currentYearSpend.spend || 0,
        totalPayments: invoiceStats.total_payments || 0
      };
    }

    res.json(kpis);
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({ error: 'Failed to fetch KPIs' });
  }
});

// GET /api/dashboard/charts
router.get('/charts', async (req, res) => {
  try {
    const db = await getDb();
    const tenantId = req.user.tenantId;
    const isVendor = req.user.role === 'VENDOR' || req.user.role === 'vendor';
    const vendorId = req.user.vendorId;

    let vendorFilter = '';
    let params = [tenantId];

    if (isVendor && vendorId) {
      vendorFilter = ' AND vendor_id = ? ';
      params.push(vendorId);
    }

    // Monthly Spend (Last 6 months)
    const monthlySpend = await db.all(`
      SELECT 
        to_char(date_trunc('month', created_at), 'Mon YYYY') as month,
        SUM(grand_total) as spend
      FROM purchase_invoices
      WHERE tenant_id = $1 ${vendorFilter ? `AND vendor_id = $2` : ''}
        AND created_at >= current_date - interval '6 months'
      GROUP BY date_trunc('month', created_at)
      ORDER BY date_trunc('month', created_at) ASC
    `, params);

    // Invoice Status Distribution
    const invoiceStatus = await db.all(`
      SELECT status, COUNT(*) as count
      FROM purchase_invoices
      WHERE tenant_id = $1 ${vendorFilter ? `AND vendor_id = $2` : ''}
      GROUP BY status
    `, params);

    // PO Status Distribution
    const poStatus = await db.all(`
      SELECT status, COUNT(*) as count
      FROM purchase_orders
      WHERE tenant_id = $1 ${vendorFilter ? `AND vendor_id = $2` : ''} AND is_latest_revision = TRUE
      GROUP BY status
    `, params);

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
router.get('/activity', async (req, res) => {
  try {
    const db = await getDb();
    const tenantId = req.user.tenantId;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    let query = `
      SELECT id, user_id, action, entity_type, entity_id, created_at
      FROM audit_logs
      WHERE tenant_id = $1
    `;
    let params = [tenantId];

    if (req.user.role === 'VENDOR' || req.user.role === 'vendor') {
      // Vendors should only see activity related to them
      // In audit_logs, we might not have vendor_id. We'll have to rely on entity_type/entity_id mappings
      // For simplicity, we can fetch their POs and Invoices and filter audit_logs
      const vendorId = req.user.vendorId;
      const pos = await db.all('SELECT id FROM purchase_orders WHERE tenant_id = ? AND vendor_id = ?', [tenantId, vendorId]);
      const invs = await db.all('SELECT id FROM purchase_invoices WHERE tenant_id = ? AND vendor_id = ?', [tenantId, vendorId]);
      
      const poIds = pos.map(p => p.id);
      const invIds = invs.map(i => i.id);
      
      if (poIds.length === 0 && invIds.length === 0) {
        return res.json([]);
      }
      
      const entityConditions = [];
      if (poIds.length > 0) entityConditions.push(`(entity_type = 'PurchaseOrder' AND entity_id = ANY($2::int[]))`);
      if (invIds.length > 0) entityConditions.push(`(entity_type = 'PurchaseInvoice' AND entity_id = ANY($3::int[]))`);
      
      query += ` AND (${entityConditions.join(' OR ')})`;
      
      // PostgreSQL handles arrays well but our wrapper might not. 
      // Safe string concatenation for IDs since they are integers
      const poIdsStr = poIds.join(',');
      const invIdsStr = invIds.join(',');
      
      query = `
        SELECT id, user_id, action, entity_type, entity_id, created_at
        FROM audit_logs
        WHERE tenant_id = $1
        AND (
          (entity_type = 'PurchaseOrder' AND entity_id IN (${poIdsStr || '0'}))
          OR (entity_type = 'PurchaseInvoice' AND entity_id IN (${invIdsStr || '0'}))
        )
      `;
      // Reset params since we inlined IDs
      params = [tenantId];
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const activity = await db.all(query, params);
    res.json(activity);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// GET /api/dashboard/notifications
router.get('/notifications', async (req, res) => {
  try {
    const db = await getDb();
    const tenantId = req.user.tenantId;
    const isVendor = req.user.role === 'VENDOR' || req.user.role === 'vendor';
    
    // For now, generating dynamic notifications based on system state
    // In a real system, you'd have a notifications table.
    let notifications = [];

    if (isVendor) {
      const vendorId = req.user.vendorId;
      // Get accepted invoices waiting for payment
      const unpiadInvs = await db.all(`
        SELECT id, invoice_number, status, updated_at
        FROM purchase_invoices
        WHERE tenant_id = $1 AND vendor_id = $2 AND status = 'Accepted'
        ORDER BY updated_at DESC LIMIT 5
      `, [tenantId, vendorId]);
      
      unpiadInvs.forEach(inv => {
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
      const pendingApps = await db.all(`
        SELECT va.id, vi.companyName as company_name, va.created_at
        FROM vendor_applications va
        LEFT JOIN vendor_invitations vi ON va.invitation_id = vi.id
        WHERE va.tenant_id = $1 AND va.status IN ('SUBMITTED', 'IN_REVIEW')
        ORDER BY va.created_at DESC LIMIT 5
      `, [tenantId]);
      
      pendingApps.forEach(app => {
        notifications.push({
          id: `app-${app.id}`,
          title: 'Pending Vendor Application',
          message: `${app.company_name} applied for registration.`,
          type: 'warning',
          created_at: app.created_at
        });
      });
      
      const pendingInvs = await db.all(`
        SELECT id, invoice_number, created_at
        FROM purchase_invoices
        WHERE tenant_id = $1 AND status = 'Submitted'
        ORDER BY created_at DESC LIMIT 5
      `, [tenantId]);
      
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

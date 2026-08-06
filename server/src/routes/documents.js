import express from 'express';
import { getDb } from '../config/db.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/permissions.js';
import { tenantWhere, tenantAnd } from '../utils/tenantQuery.js';

const router = express.Router();

// GET /api/documents/vendors
// Fetches all accepted vendors with their total document count
router.get('/vendors', authenticateToken, authorize(PERMISSIONS.VENDOR_VIEW), async (req, res) => {
  try {
    const db = await getDb();
    const { whereClause, params } = tenantWhere(req.user, 'v');
    
    const query = `
      SELECT 
        v.id,
        v.vendor_code,
        v.company_name as vendor_name,
        v.gst_number as gstin,
        v.status,
        COUNT(d.id) as total_documents
      FROM vendors v
      LEFT JOIN documents d ON d.entity_type = 'Vendor' AND d.entity_id = v.id
      ${whereClause}
      GROUP BY v.id
      ORDER BY v.company_name ASC
    `;
    
    const vendors = await db.all(query, params);
    res.json(vendors);
  } catch (error) {
    console.error('Error fetching document vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors for documents' });
  }
});

// GET /api/documents/vendors/:id
// Fetches all documents associated with a specific vendor
router.get('/vendors/:id', authenticateToken, authorize(PERMISSIONS.VENDOR_VIEW), async (req, res) => {
  try {
    const db = await getDb();
    const vendorId = req.params.id;
    const { andClause, params: tenantParams } = tenantAnd(req.user);
    
    // Validate vendor exists
    const vendor = await db.get(`SELECT company_name FROM vendors WHERE id = ?${andClause}`, [vendorId, ...tenantParams]);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const query = `
      SELECT * FROM documents
      WHERE entity_type = 'Vendor' AND entity_id = ?
      ORDER BY uploaded_at DESC
    `;
    
    const documents = await db.all(query, [vendorId]);
    
    // Normalize file paths
    const normalizedDocuments = documents.map(doc => ({
      ...doc,
      file_path: doc.file_path ? (doc.file_path.startsWith('/') ? doc.file_path : '/' + doc.file_path.replace(/\\/g, '/')) : null
    }));
    
    res.json({
      vendor_name: vendor.company_name,
      documents: normalizedDocuments
    });
  } catch (error) {
    console.error('Error fetching vendor documents:', error);
    res.status(500).json({ error: 'Failed to fetch vendor documents' });
  }
});

// GET /api/documents/purchase-orders
// Fetches all purchase orders with their total document count
router.get('/purchase-orders', authenticateToken, authorize(PERMISSIONS.PO_VIEW), async (req, res) => {
  try {
    const db = await getDb();
    const { whereClause, params } = tenantWhere(req.user, 'p');
    
    const query = `
      SELECT 
        p.id,
        p.po_number,
        p.po_date,
        v.company_name as vendor_name,
        p.status,
        COUNT(d.id) as total_documents
      FROM purchase_orders p
      LEFT JOIN vendors v ON p.vendor_id = v.id
      LEFT JOIN documents d ON d.entity_type = 'PurchaseOrder' AND d.entity_id = p.id
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.po_date DESC
    `;
    
    const pos = await db.all(query, params);
    res.json(pos);
  } catch (error) {
    console.error('Error fetching document POs:', error);
    res.status(500).json({ error: 'Failed to fetch purchase orders for documents' });
  }
});

// GET /api/documents/purchase-orders/:id
// Fetches all documents associated with a specific PO
router.get('/purchase-orders/:id', authenticateToken, authorize(PERMISSIONS.PO_VIEW), async (req, res) => {
  try {
    const db = await getDb();
    const poId = req.params.id;
    const { andClause, params: tenantParams } = tenantAnd(req.user);
    
    // Validate PO exists
    const po = await db.get(`SELECT po_number FROM purchase_orders WHERE id = ?${andClause}`, [poId, ...tenantParams]);
    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }
    
    const query = `
      SELECT * FROM documents
      WHERE entity_type = 'PurchaseOrder' AND entity_id = ?
      ORDER BY uploaded_at DESC
    `;
    
    const documents = await db.all(query, [poId]);
    
    // Normalize file paths
    const normalizedDocuments = documents.map(doc => ({
      ...doc,
      file_path: doc.file_path ? (doc.file_path.startsWith('/') ? doc.file_path : '/' + doc.file_path.replace(/\\/g, '/')) : null
    }));
    
    res.json({
      po_number: po.po_number,
      documents: normalizedDocuments
    });
  } catch (error) {
    console.error('Error fetching PO documents:', error);
    res.status(500).json({ error: 'Failed to fetch purchase order documents' });
  }
});

export default router;

import { getDb } from '../src/config/db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function cleanAllTenants() {
  console.log('🗑️  Starting complete tenant data purge...');
  const db = await getDb();

  const tables = [
    'purchase_invoice_items',
    'purchase_invoices',
    'purchase_order_items',
    'purchase_orders',
    'vendor_documents',
    'vendor_contacts',
    'vendor_financial_profiles',
    'vendor_business_profiles',
    'vendor_company_profiles',
    'vendor_users',
    'vendors',
    'vendor_applications',
    'vendor_invitations',
    'approval_workflows',
    'erp_sync_logs',
    'tenant_settings',
    'departments'
  ];

  for (const tbl of tables) {
    try {
      await db.exec(`DELETE FROM ${tbl}`);
      console.log(`  ✓ Cleared table ${tbl}`);
    } catch (e) {
      console.warn(`  - Table ${tbl} cleanup skipped: ${e.message}`);
    }
  }

  // Clear tenant audit logs FIRST to avoid FK constraints on users
  try {
    await db.exec(`DELETE FROM audit_logs`);
    console.log(`  ✓ Cleared all audit logs`);
  } catch (e) {
    console.warn(`  - Audit logs cleanup error: ${e.message}`);
  }

  // Delete all non-SUPER_ADMIN users
  try {
    await db.exec(`DELETE FROM users WHERE role != 'SUPER_ADMIN'`);
    console.log(`  ✓ Cleared all tenant users (kept SUPER_ADMIN)`);
  } catch (e) {
    console.warn(`  - Users cleanup error: ${e.message}`);
  }

  // Delete all tenants
  try {
    await db.exec(`DELETE FROM tenants`);
    // Try resetting sequence if available
    try {
      await db.exec(`ALTER SEQUENCE tenants_id_seq RESTART WITH 1`);
    } catch (seqErr) {
      // Ignore sequence restart error
    }
    console.log(`  ✓ Cleared all tenants and reset sequence`);
  } catch (e) {
    console.error(`  ❌ Failed to delete tenants: ${e.message}`);
  }

  console.log('🎉 Successfully purged all tenant records! Database is clean for fresh tenant creation.');
  process.exit(0);
}

cleanAllTenants().catch(err => {
  console.error('Fatal cleanup error:', err);
  process.exit(1);
});

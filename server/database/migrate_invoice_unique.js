import { pool } from '../src/config/db.js';

async function migrate() {
  console.log('Running migration: Fix invoice number unique constraint...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Drop the old tenant_id + invoice_number constraint
    await client.query(`ALTER TABLE purchase_invoices DROP CONSTRAINT IF EXISTS purchase_invoices_tenant_invoice_number_unique`);
    
    // Add the correct tenant_id + vendor_id + invoice_number constraint
    await client.query(`ALTER TABLE purchase_invoices ADD CONSTRAINT purchase_invoices_tenant_vendor_invoice_unique UNIQUE(tenant_id, vendor_id, invoice_number)`);
    
    // Also record it in migration_history
    await client.query(`INSERT INTO migration_history (migration_name) VALUES ('fix_invoice_unique_constraint') ON CONFLICT DO NOTHING`);
    
    await client.query('COMMIT');
    console.log('Migration successful.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();

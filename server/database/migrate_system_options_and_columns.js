import { pool } from '../src/config/db.js';

async function migrate() {
  console.log('Running migration: System options and columns...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    await client.query('ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS due_date DATE');
    await client.query('ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS bank_name TEXT');
    await client.query('ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS remarks TEXT');
    
    // PO Revisions migration
    await client.query('ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS base_po_number TEXT');
    await client.query('ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS revision_number INTEGER DEFAULT 0');
    await client.query('ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS parent_po_id INTEGER');
    await client.query('ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS is_latest_revision BOOLEAN DEFAULT TRUE');

    // Add system_options table
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_options (
        id SERIAL PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        value VARCHAR(255) NOT NULL,
        UNIQUE(category, value)
      )
    `);
    
    // Seed default options if empty
    const res = await client.query(`SELECT count(*) as count FROM system_options`);
    if (res && res.rows[0] && parseInt(res.rows[0].count) === 0) {
      const defaultTypes = ["Manufacturer", "Distributor", "Service Provider", "Retailer", "Consultant"];
      const defaultCategories = ["IT Services", "Office Supplies", "Logistics", "Raw Materials", "Marketing"];
      
      for (const type of defaultTypes) {
        await client.query(`INSERT INTO system_options (category, value) VALUES ('vendorType', $1)`, [type]);
      }
      for (const cat of defaultCategories) {
        await client.query(`INSERT INTO system_options (category, value) VALUES ('vendorCategory', $1)`, [cat]);
      }
    }
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_config (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT
      )
    `);
    
    await client.query(`INSERT INTO migration_history (migration_name) VALUES ('migrate_system_options_and_columns') ON CONFLICT DO NOTHING`);
    
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

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '../.env' });

const pool = new Pool({
  user: process.env.PG_USER || 'vendor_user',
  host: process.env.PG_HOST || 'localhost', 
  database: process.env.PG_DATABASE || 'vendor_db',
  password: process.env.PG_PASSWORD || 'kalyan013',
  port: process.env.PG_PORT || 5432,
});

async function clearDB() {
  try {
    const tables = [
      'audit_logs', 'vendor_users', 'purchase_invoice_items', 'purchase_invoices',
      'purchase_order_items', 'purchase_orders', 'vendor_documents',
      'vendor_contacts', 'vendor_financial_profiles', 'vendor_business_profiles',
      'vendor_company_profiles', 'vendors', 'vendor_applications', 'vendor_invitations'
    ];
    
    for (const table of tables) {
      await pool.query(`TRUNCATE TABLE ${table} CASCADE;`);
      console.log(`Cleared ${table}`);
    }
    
    console.log('Database cleared successfully!');
  } catch (e) {
    console.error('Error clearing database:', e);
  } finally {
    pool.end();
  }
}

clearDB();

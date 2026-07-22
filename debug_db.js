import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

async function main() {
  const db = await open({
    filename: './server/database/database.sqlite',
    driver: sqlite3.Database
  });

  const pos = await db.all('SELECT id, po_number, vendor_id, vendor_name FROM purchase_orders');
  console.log('Purchase Orders:', pos);

  const vu = await db.all('SELECT id, vendor_id, email, full_name, role FROM vendor_users');
  console.log('Vendor Users:', vu);
  
  const v = await db.all('SELECT id, company_name FROM vendors');
  console.log('Vendors:', v);
}

main().catch(console.error);

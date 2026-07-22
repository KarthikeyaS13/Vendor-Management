import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const db = await open({
    filename: path.join(__dirname, '../database/database.sqlite'),
    driver: sqlite3.Database
  });

  console.log('Creating documents view...');
  
  await db.exec(`
    CREATE VIEW IF NOT EXISTS documents AS
    
    -- Vendor Onboarding Documents
    SELECT 
      'VENDOR_DOC_' || vd.id as id,
      'Vendor' as entity_type,
      v.id as entity_id, 
      dt.name as document_type,
      vd.file_name as file_name,
      vd.file_name as original_name,
      vd.file_path as file_path,
      vd.mime_type as mime_type,
      'Vendor' as uploaded_by,
      vd.created_at as uploaded_at
    FROM vendor_documents vd
    JOIN document_types dt ON vd.document_type_id = dt.id
    JOIN vendors v ON vd.application_id = v.application_id
    
    UNION ALL
    
    -- Purchase Invoices
    SELECT 
      'INVOICE_' || pi.id as id,
      'PurchaseOrder' as entity_type,
      pi.purchase_order_id as entity_id,
      'Vendor Invoice' as document_type,
      pi.invoice_number || ' - Invoice' as file_name,
      pi.invoice_number || '.pdf' as original_name,
      pi.invoice_file as file_path,
      'application/pdf' as mime_type,
      'Vendor' as uploaded_by,
      pi.created_at as uploaded_at
    FROM purchase_invoices pi
    WHERE pi.invoice_file IS NOT NULL
  `);

  console.log('Documents view created successfully!');
  await db.close();
}

migrate().catch(console.error);

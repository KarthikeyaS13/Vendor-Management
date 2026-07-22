import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  user: 'vendor_user',
  host: '165.22.211.231',
  database: 'vendor_db',
  password: 'kalyan013',
  port: 5432,
});

async function testSchema() {
  try {
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the full schema
    await pool.query(schema);
    console.log("✅ Schema executed successfully! All tables created.");
  } catch (error) {
    console.error("❌ SQL Syntax Error in PostgreSQL:");
    console.error(error.message);
    if (error.position) {
      console.error("At position:", error.position);
    }
  } finally {
    await pool.end();
  }
}

testSchema();

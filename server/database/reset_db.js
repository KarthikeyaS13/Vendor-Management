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

async function resetDB() {
  try {
    console.log('Dropping schema public...');
    await pool.query('DROP SCHEMA public CASCADE;');
    await pool.query('CREATE SCHEMA public;');
    await pool.query('GRANT ALL ON SCHEMA public TO vendor_user;');
    await pool.query('GRANT ALL ON SCHEMA public TO public;');
    
    console.log('Loading schema.sql...');
    const schemaPath = path.join(process.cwd(), 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schemaSql);
    console.log('Database reset successfully!');
  } catch (e) {
    console.error('Error resetting database:', e);
  } finally {
    pool.end();
  }
}

resetDB();

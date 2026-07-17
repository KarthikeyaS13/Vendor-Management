import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function alterDb() {
  try {
    const db = await open({
      filename: path.join(__dirname, 'database/database.sqlite'),
      driver: sqlite3.Database
    });
    
    // Check if column exists first to avoid errors if run multiple times
    const tableInfo = await db.all("PRAGMA table_info(vendor_invitations)");
    const hasTempPassword = tableInfo.some(col => col.name === 'temp_password');
    
    if (!hasTempPassword) {
      await db.run("ALTER TABLE vendor_invitations ADD COLUMN temp_password TEXT;");
      console.log('Successfully added temp_password column to vendor_invitations');
    } else {
      console.log('temp_password column already exists in vendor_invitations');
    }
  } catch (err) {
    console.error('Error altering database:', err);
  }
}

alterDb();

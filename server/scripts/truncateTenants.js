import { getDb } from '../src/config/db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function truncateTenants() {
  console.log('🗑️  Starting complete tenant data purge using CASCADE...');
  const db = await getDb();

  try {
    // This will delete everything referencing tenants, including users, audit_logs, etc.
    // SUPER_ADMIN users with no tenant_id will remain untouched.
    await db.exec(`TRUNCATE TABLE tenants CASCADE`);
    console.log(`  ✓ Successfully truncated tenants and all related data (CASCADE)`);
    
    // Try resetting sequence if available
    try {
      await db.exec(`ALTER SEQUENCE tenants_id_seq RESTART WITH 1`);
    } catch (seqErr) {
      // Ignore sequence restart error
    }
    console.log('🎉 Successfully purged all tenant records! Database is clean for fresh tenant creation.');
  } catch (e) {
    console.error(`  ❌ Failed to truncate tenants: ${e.message}`);
  }

  process.exit(0);
}

truncateTenants().catch(err => {
  console.error('Fatal cleanup error:', err);
  process.exit(1);
});

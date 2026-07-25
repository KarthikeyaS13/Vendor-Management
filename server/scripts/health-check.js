import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

console.log('=== Production Environment Startup Validation ===');

const requiredEnvVars = ['PG_USER', 'PG_PASSWORD', 'PG_DATABASE', 'PG_HOST', 'PG_PORT'];
const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingVars.length > 0) {
  console.error(`❌ Startup Error: Missing required database environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}
console.log('✅ Environment variables validated.');

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT, 10),
});

async function checkHealth() {
  try {
    // 1. Check Connectivity & Authentication
    console.log('[1/4] Checking PostgreSQL Connectivity & Authentication...');
    const authCheck = await pool.query('SELECT current_user, current_database()');
    console.log(`✅ Successfully authenticated as user "${authCheck.rows[0].current_user}" to database "${authCheck.rows[0].current_database}".`);

    // 2. Check Database Ownership / Permissions (Can we read tables?)
    console.log('[2/4] Checking Table Permissions & Ownership...');
    const tables = ['vendors', 'vendor_applications', 'users', 'system_options'];
    for (const table of tables) {
      await pool.query(`SELECT 1 FROM ${table} LIMIT 1`);
      console.log(`✅ Have SELECT permissions on '${table}'.`);
    }

    // 3. Check Migrations
    console.log('[3/4] Checking Migrations...');
    await pool.query('SELECT due_date, bank_name, remarks FROM purchase_invoices LIMIT 1');
    await pool.query('SELECT key, value FROM system_config LIMIT 1');
    console.log('✅ All migrations verified successfully.');

    // 4. Test Dashboard Queries
    console.log('[4/4] Testing Dashboard Queries...');
    await pool.query('SELECT COUNT(*) as count FROM vendors');
    await pool.query("SELECT COUNT(*) as count FROM vendor_applications WHERE status = 'IN_REVIEW'");
    console.log('✅ Dashboard queries successful.');

    console.log('\n🎉 Health Check Passed! The production environment is fully healthy.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Health Check Failed!');
    console.error(error.message);
    process.exit(1);
  }
}

checkHealth();

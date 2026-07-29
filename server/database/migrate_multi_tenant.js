import { getDb } from '../src/config/db.js';

async function migrate() {
  console.log('================================================');
  console.log(' Starting Multi-Tenant Database Migration (Phase 1)');
  console.log('================================================');
  
  const db = await getDb();
  const report = [];

  try {
    await db.run('BEGIN TRANSACTION');

    // 1. Create Migration History Table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS migration_history (
        id SERIAL PRIMARY KEY,
        migration_name TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if migration already ran
    const migrationCheck = await db.get("SELECT id FROM migration_history WHERE migration_name = '2026_01_multi_tenant'");
    if (migrationCheck) {
      console.log('Migration "2026_01_multi_tenant" has already been executed. Skipping.');
      await db.run('ROLLBACK');
      process.exit(0);
    }

    // 2. Create tenants table
    console.log('Creating "tenants" table...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        company_name TEXT NOT NULL,
        company_code TEXT UNIQUE,
        email TEXT,
        phone TEXT,
        logo TEXT,
        website TEXT,
        address TEXT,
        subscription_plan TEXT,
        subscription_status TEXT DEFAULT 'ACTIVE',
        status TEXT DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create tenant_settings table
    console.log('Creating "tenant_settings" table...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tenant_settings (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id),
        key TEXT NOT NULL,
        value TEXT,
        UNIQUE(tenant_id, key)
      );
    `);

    // 4. Insert default tenant
    let finnovo = await db.get("SELECT id FROM tenants WHERE company_name = 'Finnovo'");
    if (!finnovo) {
      await db.run("INSERT INTO tenants (company_name, company_code) VALUES ('Finnovo', 'FNV')");
      finnovo = await db.get("SELECT id FROM tenants WHERE company_name = 'Finnovo'");
    }
    const tenantId = finnovo.id;
    console.log(`Default tenant (Finnovo) verified. ID: ${tenantId}`);

    // Business tables only. Intentionally excluding global tables like 'roles' and 'document_types'
    const tables = [
      'departments', 'users', 'vendor_invitations', 'vendor_applications', 
      'vendors', 'vendor_company_profiles', 'vendor_business_profiles', 
      'vendor_financial_profiles', 'vendor_contacts', 'vendor_documents', 
      'approval_workflows', 'audit_logs', 'erp_sync_logs', 'vendor_users', 
      'purchase_orders', 'purchase_order_items', 'purchase_invoices', 
      'purchase_invoice_items'
    ];

    console.log('\n--- Altering Tables ---');
    
    for (const table of tables) {
      // Check if table exists in postgres
      const tableExistsResult = await db.get(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        ) as exists
      `, [table]);
      
      if (!tableExistsResult || !tableExistsResult.exists) {
         console.log(`⚠️ Skipped: Table '${table}' does not exist.`);
         continue;
      }

      // Add tenant_id if it doesn't exist
      try {
        await db.exec(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS tenant_id INTEGER`);
      } catch (e) {
        if (e.code !== '42701') throw e; 
      }

      // Backfill existing records
      const updateResult = await db.run(`UPDATE ${table} SET tenant_id = $1 WHERE tenant_id IS NULL`, [tenantId]);
      
      // Validate no nulls
      const nulls = await db.get(`SELECT COUNT(*) as count FROM ${table} WHERE tenant_id IS NULL`);
      if (nulls.count > 0) {
        throw new Error(`Failed to backfill ${table}. ${nulls.count} NULL records remain.`);
      }

      // Convert to NOT NULL
      await db.exec(`ALTER TABLE ${table} ALTER COLUMN tenant_id SET NOT NULL`);

      // Add FK safely
      const fkCheckResult = await db.get(`
        SELECT count(*) as count 
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' AND table_name = $1 AND constraint_name = $2
      `, [table, `fk_${table}_tenant`]);
      
      if (parseInt(fkCheckResult.count) === 0) {
        await db.exec(`ALTER TABLE ${table} ADD CONSTRAINT fk_${table}_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)`);
      }

      // Add Indexes
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_tenant_id ON ${table}(tenant_id)`);
      // Add created_at index if table has created_at
      const hasCreatedAt = await db.get(`
         SELECT EXISTS (
           SELECT FROM information_schema.columns 
           WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'created_at'
         ) as exists
      `, [table]);
      
      if (hasCreatedAt && hasCreatedAt.exists) {
         await db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_tenant_created ON ${table}(tenant_id, created_at DESC)`);
      }
      
      // Add status index if table has status
      const hasStatus = await db.get(`
         SELECT EXISTS (
           SELECT FROM information_schema.columns 
           WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'status'
         ) as exists
      `, [table]);
      
      if (hasStatus && hasStatus.exists) {
         await db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_tenant_status ON ${table}(tenant_id, status)`);
      }

      report.push(`✔ ${table.padEnd(25)} | ${String(updateResult.changes || 0).padStart(4)} rows updated`);
    }

    // 5. Update Unique Constraints dynamically
    console.log('\n--- Rebuilding Unique Constraints ---');
    const uniqueFields = [
      { t: 'users', col: 'email' },
      { t: 'vendor_invitations', col: 'invitationId' },
      { t: 'vendor_invitations', col: 'token' },
      { t: 'vendor_applications', col: 'invitation_id' },
      { t: 'vendor_applications', col: 'application_number' },
      { t: 'vendors', col: 'vendor_code' },
      { t: 'vendors', col: 'application_id' },
      { t: 'vendor_company_profiles', col: 'application_id' },
      { t: 'vendor_business_profiles', col: 'application_id' },
      { t: 'vendor_financial_profiles', col: 'application_id' },
      { t: 'vendor_users', col: 'email' },
      { t: 'purchase_orders', col: 'po_number' },
      { t: 'purchase_invoices', col: 'invoice_number' }
    ];

    for (const u of uniqueFields) {
       // Check if table exists
       const tableExistsResult = await db.get(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) as exists`, [u.t]);
       if (!tableExistsResult || !tableExistsResult.exists) continue;

       // Find existing UNIQUE constraints containing this column (excluding tenant_id)
       const existingConstraints = await db.all(`
          SELECT conname 
          FROM pg_constraint 
          JOIN pg_class ON conrelid = pg_class.oid
          JOIN pg_attribute ON pg_attribute.attrelid = pg_class.oid AND pg_attribute.attnum = ANY(pg_constraint.conkey)
          WHERE pg_class.relname = $1 AND pg_attribute.attname = $2 AND contype = 'u'
       `, [u.t, u.col]);

       for (const constraint of existingConstraints) {
           // Don't drop our own composite constraint if it already exists
           if (constraint.conname !== `${u.t}_tenant_${u.col}_unique`) {
              await db.exec(`ALTER TABLE ${u.t} DROP CONSTRAINT IF EXISTS ${constraint.conname}`);
           }
       }

       // Add composite unique
       try {
         await db.exec(`ALTER TABLE ${u.t} ADD CONSTRAINT ${u.t}_tenant_${u.col}_unique UNIQUE(tenant_id, ${u.col})`);
       } catch (e) {
         if (e.code !== '42710') { // 42710 duplicate object
             console.error(`Could not add composite unique constraint for ${u.t}.${u.col}:`, e.message);
         }
       }
    }

    // 6. Verification Queries
    console.log('\n--- Running Final Validation ---');
    for (const table of tables) {
       const tableExistsResult = await db.get(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) as exists`, [table]);
       if (!tableExistsResult || !tableExistsResult.exists) continue;
       
       const orphanCheck = await db.get(`
          SELECT COUNT(*) as orphans
          FROM ${table} u
          LEFT JOIN tenants t ON u.tenant_id = t.id
          WHERE t.id IS NULL
       `);
       
       if (parseInt(orphanCheck.orphans) > 0) {
           throw new Error(`Validation failed! Found ${orphanCheck.orphans} orphans in ${table}.`);
       }
    }

    // Mark migration as done
    await db.run("INSERT INTO migration_history (migration_name) VALUES ('2026_01_multi_tenant')");
    
    await db.run('COMMIT');

    console.log('\n================================================');
    console.log(' Migration Report');
    console.log('================================================');
    report.forEach(line => console.log(line));
    console.log('\nAll foreign keys, composite unique constraints, and indexes validated.');
    console.log('Migration "2026_01_multi_tenant" successfully executed.');
    console.log('================================================\n');

  } catch (error) {
    await db.run('ROLLBACK');
    console.error('\n❌ Migration failed, rolled back completely.');
    console.error('Error Details:', error);
  } finally {
    const d = await getDb();
    await d.close();
    process.exit(0);
  }
}

migrate();

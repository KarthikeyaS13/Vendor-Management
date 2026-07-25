import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

let dbInstance = null;

const pool = new Pool({
  user: process.env.PG_USER || 'vendor_user',
  host: process.env.PG_HOST || 'localhost', 
  database: process.env.PG_DATABASE || 'vendor_db',
  password: process.env.PG_PASSWORD || 'kalyan013',
  port: process.env.PG_PORT || 5432,
});

// Helper to convert SQLite `?` to PostgreSQL `$1, $2` etc.
function convertQuery(sql) {
  let i = 1;
  return sql.replace(/\?/g, () => `$${i++}`);
}

export const getDb = async () => {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = {
    get: async (sql, params = []) => {
      try {
        const res = await pool.query(convertQuery(sql), params);
        return res.rows[0];
      } catch (err) {
        console.error('DB GET Error:', err, sql);
        throw err;
      }
    },
    all: async (sql, params = []) => {
      try {
        const res = await pool.query(convertQuery(sql), params);
        return res.rows;
      } catch (err) {
        console.error('DB ALL Error:', err, sql);
        throw err;
      }
    },
    run: async (sql, params = []) => {
      try {
        let query = convertQuery(sql);
        // SQLite expects db.run to return { lastID } for inserts
        if (query.trim().toUpperCase().startsWith('INSERT') && !query.toUpperCase().includes('RETURNING')) {
          query += ' RETURNING id';
        }
        const res = await pool.query(query, params);
        return {
          lastID: res.rows && res.rows.length > 0 ? res.rows[0].id : null,
          changes: res.rowCount
        };
      } catch (err) {
        console.error('DB RUN Error:', err, sql);
        throw err;
      }
    },
    exec: async (sql) => {
      try {
        // Simple exec without parameters
        return await pool.query(sql);
      } catch (err) {
        console.error('DB EXEC Error:', err);
        throw err;
      }
    },
    close: async () => {
      await pool.end();
    }
  };

  // Run migrations that might be missing
  try {
    await dbInstance.run('ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS due_date DATE');
  } catch (e) {
    // Column might already exist, ignore
  }

  try {
    await dbInstance.run('ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS bank_name TEXT');
  } catch (e) {
    // Column might already exist, ignore
  }

  try {
    await dbInstance.run('ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS remarks TEXT');
  } catch (e) {
    // Column might already exist, ignore
  }

  // Add system_options table
  try {
    await dbInstance.run(`
      CREATE TABLE IF NOT EXISTS system_options (
        id SERIAL PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        value VARCHAR(255) NOT NULL,
        UNIQUE(category, value)
      )
    `);
    
    // Seed default options if empty
    const res = await dbInstance.all(`SELECT count(*) as count FROM system_options`);
    if (res && res[0] && parseInt(res[0].count) === 0) {
      const defaultTypes = ["Manufacturer", "Distributor", "Service Provider", "Retailer", "Consultant"];
      const defaultCategories = ["IT Services", "Office Supplies", "Logistics", "Raw Materials", "Marketing"];
      
      for (const type of defaultTypes) {
        await dbInstance.run(`INSERT INTO system_options (category, value) VALUES ('vendorType', $1)`, [type]);
      }
      for (const cat of defaultCategories) {
        await dbInstance.run(`INSERT INTO system_options (category, value) VALUES ('vendorCategory', $1)`, [cat]);
      }
    }
  } catch (e) {
    console.error('Migration error for system_options:', e);
  }
  try {
    await dbInstance.run(`
      CREATE TABLE IF NOT EXISTS system_config (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT
      )
    `);
  } catch (e) {
    console.error('Migration error for system_config:', e);
  }

  return dbInstance;
};

// Export a mock pool interface to mimic the existing behavior for simple queries
// if any exist, but it's better to refactor to use getDb().
export default {
  query: async (sql, params) => {
    const db = await getDb();
    return db.all(sql, params);
  },
  execute: async (sql, params) => {
    const db = await getDb();
    const result = await db.run(sql, params);
    return [result]; // mimic mysql2 [results, fields] return
  }
};

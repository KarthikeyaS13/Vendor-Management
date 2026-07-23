import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

let dbInstance = null;

const pool = new Pool({
  user: 'vendor_user',
  host: process.env.PG_HOST || '165.22.211.231', // Using the specified server IP
  database: 'vendor_db',
  password: 'kalyan013',
  port: 5432,
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

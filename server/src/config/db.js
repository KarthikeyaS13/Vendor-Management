import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const requiredEnvVars = ['PG_USER', 'PG_PASSWORD', 'PG_DATABASE'];
const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingVars.length > 0) {
  console.error(`❌ Startup Error: Missing required database environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}



export const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST || '127.0.0.1', 
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT || '5432', 10),
});

// Helper to convert parameter placeholders to PostgreSQL format.
export function convertQuery(sql) {
  let i = 1;
  return sql.replace(/\?/g, () => `$${i++}`);
}

export async function generateSequence(client, tenantId, configKey, defaultPrefix) {
  // We use Postgres row locking (FOR UPDATE) to guarantee atomic sequence generation.
  // The 'client' provided MUST already be inside a transaction (BEGIN).
  await client.query(`
    INSERT INTO tenant_settings (tenant_id, key, value) 
    VALUES ($1, $2, $3) 
    ON CONFLICT (tenant_id, key) DO NOTHING
  `, [tenantId, configKey, JSON.stringify({ prefix: defaultPrefix, nextNumber: 1, padding: defaultPrefix === 'VEN' ? 3 : 4 })]);

  const res = await client.query(`
    SELECT value FROM tenant_settings 
    WHERE tenant_id = $1 AND key = $2 
    FOR UPDATE
  `, [tenantId, configKey]);

  let config;
  try {
    config = JSON.parse(res.rows[0].value);
  } catch (err) {
    console.error(`[generateSequence] Malformed JSON in tenant_settings for key ${configKey}, resetting sequence.`, err.message);
    config = { prefix: defaultPrefix, nextNumber: 1, padding: defaultPrefix === 'VEN' ? 3 : 4 };
  }

  const nextNumStr = String(config.nextNumber || 1).padStart(config.padding || (defaultPrefix === 'VEN' ? 3 : 4), '0');
  const generatedId = `${config.prefix || defaultPrefix}${nextNumStr}`;

  config.nextNumber = (config.nextNumber || 1) + 1;

  await client.query(`
    UPDATE tenant_settings 
    SET value = $1 
    WHERE tenant_id = $2 AND key = $3
  `, [JSON.stringify(config), tenantId, configKey]);

  return generatedId;
}

let dbInstance;

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
        console.error(`❌ DB GET Error [${err.code}]: ${err.message}`);
        console.error(`   Query: ${sql}`);
        throw err;
      }
    },
    all: async (sql, params = []) => {
      try {
        const res = await pool.query(convertQuery(sql), params);
        return res.rows;
      } catch (err) {
        console.error(`❌ DB ALL Error [${err.code}]: ${err.message}`);
        console.error(`   Query: ${sql}`);
        throw err;
      }
    },
    run: async (sql, params = []) => {
      try {
        let query = convertQuery(sql);
        // Legacy insert compatibility for existing application code.
        if (query.trim().toUpperCase().startsWith('INSERT') && !query.toUpperCase().includes('RETURNING')) {
          query += ' RETURNING id';
        }
        const res = await pool.query(query, params);
        return {
          lastID: res.rows && res.rows.length > 0 ? res.rows[0].id : null,
          changes: res.rowCount
        };
      } catch (err) {
        console.error(`❌ DB RUN Error [${err.code}]: ${err.message}`);
        console.error(`   Query: ${sql}`);
        throw err;
      }
    },
    exec: async (sql) => {
      try {
        // Simple exec without parameters
        return await pool.query(sql);
      } catch (err) {
        console.error(`❌ DB EXEC Error [${err.code}]: ${err.message}`);
        throw err;
      }
    },
    close: async () => {
      await pool.end();
    }
  };

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

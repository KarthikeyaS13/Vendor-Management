import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({
  user: 'vendor_user',
  host: '127.0.0.1',
  database: 'vendor_db',
  password: 'kalyan013',
  port: 5432,
});
pool.query('SELECT NOW()')
  .then(res => { console.log('Successfully connected to vendor_db as vendor_user!'); pool.end(); })
  .catch(err => { console.error('Connection error:', err); pool.end(); });

import bcrypt from 'bcrypt';
import { getDb } from './src/config/db.js';

async function seedSuperAdmin() {
  try {
    const db = await getDb();
    console.log('Seeding SUPER_ADMIN user...');

    const username = 'admin';
    const email = 'superadmin@finnovo.local';
    const rawPassword = 'admin';
    const role = 'SUPER_ADMIN';

    // Check if super admin already exists
    const existing = await db.get('SELECT * FROM users WHERE role = ? OR username = ?', [role, username]);
    
    if (existing) {
      console.log('SUPER_ADMIN already exists in database. Updating password just in case...');
      const passwordHash = await bcrypt.hash(rawPassword, 10);
      await db.run(
        'UPDATE users SET password_hash = ?, is_active = true, tenant_id = NULL, vendor_id = NULL, role = ? WHERE id = ?',
        [passwordHash, role, existing.id]
      );
      console.log('SUPER_ADMIN updated successfully.');
    } else {
      console.log('Creating new SUPER_ADMIN user...');
      const passwordHash = await bcrypt.hash(rawPassword, 10);
      await db.run(
        `INSERT INTO users (
          username, email, password_hash, role, is_active, tenant_id, vendor_id, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [username, email, passwordHash, role, true, null, null]
      );
      console.log('SUPER_ADMIN created successfully.');
    }
    
    console.log('Seed process complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding super admin:', error);
    process.exit(1);
  }
}

seedSuperAdmin();

import { getDb } from './src/config/db.js';

async function run() {
  const db = await getDb();
  const user = await db.get("SELECT * FROM users WHERE username = 'admin_global'");
  console.log(user);
  
  if (user) {
    const bcrypt = await import('bcrypt');
    const match = await bcrypt.compare('password123', user.password_hash);
    console.log("Password match:", match);
  }
  process.exit(0);
}
run();

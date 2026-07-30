const bcrypt = require('bcrypt');
const hash = bcrypt.hashSync('password123', 10);
console.log('Valid bcrypt hash for password123:', hash);

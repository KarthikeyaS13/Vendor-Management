import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, '../server/uploads/invoices');
console.log('Uploads directory:', uploadsDir);
console.log('Exists?', fs.existsSync(uploadsDir));
if (fs.existsSync(uploadsDir)) {
  console.log('Files:', fs.readdirSync(uploadsDir));
}

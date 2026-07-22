import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, 'schema.sql');
let sql = fs.readFileSync(schemaPath, 'utf8');

// The simplest way to bypass PostgreSQL constraint checking during a bulk dump/schema execution 
// is to temporarily disable trigger checks, but that requires superuser.
// A better way is to move all FOREIGN KEY definitions to ALTER TABLE statements.

let currentTable = '';
const alterStatements = [];

// Split by lines and reconstruct
const lines = sql.split('\n');
const newLines = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // Track current table
  const matchTable = line.match(/CREATE TABLE IF NOT EXISTS ([\w_]+)/i);
  if (matchTable) {
    currentTable = matchTable[1];
  }
  
  // Look for FOREIGN KEY
  // Example: FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  const fkMatch = line.match(/FOREIGN KEY\s*\(([^)]+)\)\s*REFERENCES\s*([\w_]+)\s*\(([^)]+)\)(.*)/i);
  
  if (fkMatch && currentTable) {
    const cols = fkMatch[1];
    const refTable = fkMatch[2];
    const refCols = fkMatch[3];
    const extra = fkMatch[4].replace(/,$/, '').trim(); // remove trailing comma
    
    // Add to alter statements
    alterStatements.push(`ALTER TABLE ${currentTable} ADD FOREIGN KEY (${cols}) REFERENCES ${refTable}(${refCols}) ${extra};`);
    
    // Remove from CREATE TABLE. If the previous line had no comma, we don't need to do anything,
    // but if the previous line DOES need its comma removed because this line is gone, we must handle it.
    // Instead of complex logic, just comment it out. But wait, if we comment it out, the previous line has a trailing comma!
    // So let's just strip the trailing comma from the previous line if this was the last line.
    
    let prevLineIdx = newLines.length - 1;
    while(prevLineIdx >= 0 && newLines[prevLineIdx].trim() === '') {
      prevLineIdx--;
    }
    if (prevLineIdx >= 0 && line.trim().endsWith(',')) {
      // It's not the last line, we can just omit it
    } else if (prevLineIdx >= 0 && !line.trim().endsWith(',')) {
      // It WAS the last line in the table definition. We must remove the comma from the previous line!
      newLines[prevLineIdx] = newLines[prevLineIdx].replace(/,\s*$/, '');
    }
    continue; // Skip adding this line to newLines
  }
  
  newLines.push(line);
}

const finalSql = newLines.join('\n') + '\n\n-- Foreign Keys added later to avoid circular dependency errors\n' + alterStatements.join('\n');
fs.writeFileSync(schemaPath, finalSql);
console.log('Schema converted successfully! Foreign keys extracted to bottom.');

import fetch from 'node-fetch';
import { getDb } from './src/config/db.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

async function generateTestToken(tenantId, role) {
  return jwt.sign(
    { 
      id: 999,
      tenantId: tenantId, 
      role: role 
    }, 
    process.env.JWT_SECRET || 'nexus_admin_secret_key_2026',
    { expiresIn: '1h' }
  );
}

async function runTest() {
  const db = await getDb();
  
  // 1. Create two tenants
  await db.run("INSERT INTO tenants (company_name, company_code) VALUES ('Tenant A', 'TNA') ON CONFLICT DO NOTHING");
  await db.run("INSERT INTO tenants (company_name, company_code) VALUES ('Tenant B', 'TNB') ON CONFLICT DO NOTHING");
  
  const tenantA = await db.get("SELECT id FROM tenants WHERE company_code = 'TNA'");
  const tenantB = await db.get("SELECT id FROM tenants WHERE company_code = 'TNB'");
  
  console.log(`Tenant A ID: ${tenantA.id}, Tenant B ID: ${tenantB.id}`);
  
  // 2. Generate tokens
  const tokenA = await generateTestToken(tenantA.id, 'admin');
  const tokenB = await generateTestToken(tenantB.id, 'admin');
  
  console.log("Tokens generated.");
  
  // 3. Create a PO as Tenant A
  const poData = {
    po_date: '2026-07-29',
    company_name: 'Tenant A Corp',
    total_amount: 1000,
    status: 'Draft',
    items: [
      { sl_no: 1, particulars: 'Test Item', quantity: 1, rate: 1000, value: 1000 }
    ]
  };
  
  const createResponse = await fetch('http://localhost:3001/api/purchase-orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify(poData)
  });
  
  if (!createResponse.ok) {
    console.error("Failed to create PO:", await createResponse.text());
    process.exit(1);
  }
  
  const { id: poId } = await createResponse.json();
  console.log(`PO Created by Tenant A with ID: ${poId}`);
  
  // 4. Try to access it as Tenant B
  const getResponse = await fetch(`http://localhost:3001/api/purchase-orders/${poId}`, {
    headers: {
      'Authorization': `Bearer ${tokenB}`
    }
  });
  
  console.log(`Tenant B Access Response Status: ${getResponse.status}`);
  
  if (getResponse.status === 404 || getResponse.status === 401 || getResponse.status === 403) {
    console.log("✅ Cross-tenant access successfully blocked!");
  } else {
    console.error("❌ Cross-tenant access allowed!");
    console.log(await getResponse.text());
  }
  
  if (db.end) await db.end();
  process.exit(0);
}

runTest().catch(async (e) => {
  console.error(e);
  process.exit(1);
});

import axios from 'axios';

async function testCleanState() {
  const API_URL = 'http://localhost:3001/api';
  console.log('Testing fresh platform state...');

  // 1. Login as SUPER_ADMIN
  const loginRes = await axios.post(`${API_URL}/auth/login`, {
    username: 'admin',
    password: 'admin'
  });
  console.log('✅ SUPER_ADMIN login successful:', loginRes.data.user);
  const token = loginRes.data.token;

  // 2. Fetch tenants
  const tenantsRes = await axios.get(`${API_URL}/tenants`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`✅ Current tenant count: ${tenantsRes.data.length} (Expected: 0)`);

  if (tenantsRes.data.length !== 0) {
    console.error('❌ Tenants not 0! Found:', tenantsRes.data);
    process.exit(1);
  }

  console.log('🎉 All tenant records are completely purged. Ready for fresh tenant provisioning.');
}

testCleanState().catch(err => {
  console.error('Test error:', err.response?.data || err.message);
  process.exit(1);
});

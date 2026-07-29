import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { getDb } from '../config/db.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'nexus_admin_secret_key_2026';

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const db = await getDb();

    // 1. Check for hardcoded admin first
    if (username === 'admin' && password === 'admin') {
      // Find the default Finnovo tenant for the hardcoded admin
      const defaultTenant = await db.get("SELECT id, status FROM tenants WHERE company_name = 'Finnovo' LIMIT 1");
      
      if (!defaultTenant) {
         return res.status(401).json({ success: false, error: 'Missing tenant' });
      }
      if (defaultTenant.status !== 'ACTIVE') {
         return res.status(401).json({ success: false, error: 'Tenant is inactive' });
      }

      const token = jwt.sign(
        { 
          userId: 0,
          tenantId: defaultTenant.id,
          role: 'admin', 
          username: 'admin',
          email: 'admin@finnovo.local'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        token,
        user: {
          id: 0,
          tenantId: defaultTenant.id,
          username: 'admin',
          email: 'admin@finnovo.local',
          role: 'admin'
        }
      });
    }

    // 2. Check vendor_users first
    const vendorUser = await db.get(
      'SELECT vu.*, t.status as tenant_status FROM vendor_users vu JOIN tenants t ON vu.tenant_id = t.id WHERE vu.email = ?',
      [username]
    );

    if (vendorUser) {
      const passwordMatch = await bcrypt.compare(password, vendorUser.password_hash);
      if (passwordMatch) {
        if (!vendorUser.is_active) {
          return res.status(401).json({ success: false, error: 'Account is deactivated' });
        }
        
        if (!vendorUser.tenant_status) {
          return res.status(401).json({ success: false, error: 'Missing tenant' });
        }

        if (vendorUser.tenant_status !== 'ACTIVE') {
          return res.status(401).json({ success: false, error: 'Tenant is inactive' });
        }

        if (vendorUser.must_change_password) {
          return res.json({
            success: true,
            requiresPasswordChange: true,
            email: vendorUser.email,
            tenantId: vendorUser.tenant_id
          });
        }

        const token = jwt.sign(
          { 
            userId: vendorUser.id,
            tenantId: vendorUser.tenant_id,
            vendorId: vendorUser.vendor_id, 
            email: vendorUser.email,
            role: vendorUser.role
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        return res.json({
          success: true,
          token,
          user: {
            id: vendorUser.id,
            tenantId: vendorUser.tenant_id,
            vendorId: vendorUser.vendor_id,
            email: vendorUser.email,
            role: vendorUser.role
          }
        });
      }
    }

    // 3. Check users table (legacy / internal admins)
    const user = await db.get(
      'SELECT u.*, t.status as tenant_status FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE u.username = ? OR u.email = ?',
      [username, username]
    );

    if (user) {
      // Compare passwords
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      
      if (passwordMatch) {
        if (!user.is_active) {
          return res.status(401).json({ success: false, error: 'Account is deactivated' });
        }
        
        if (!user.tenant_status) {
          return res.status(401).json({ success: false, error: 'Missing tenant' });
        }

        if (user.tenant_status !== 'ACTIVE') {
          return res.status(401).json({ success: false, error: 'Tenant is inactive' });
        }

        const token = jwt.sign(
          { 
            userId: user.id, 
            tenantId: user.tenant_id,
            vendorId: user.vendor_id, 
            username: user.username,
            email: user.email,
            role: user.role
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        return res.json({
          success: true,
          token,
          user: {
            id: user.id,
            tenantId: user.tenant_id,
            vendorId: user.vendor_id,
            username: user.username,
            email: user.email,
            role: user.role
          }
        });
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }

  // 4. If neither matched, fail
  return res.status(401).json({ success: false, error: 'Invalid credentials' });
});

// Change Password Endpoint
router.post('/vendor/change-password', async (req, res) => {
  const { email, tempPassword, newPassword } = req.body;
  
  if (!email || !tempPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    const db = await getDb();
    const vendorUser = await db.get(
      'SELECT vu.*, t.status as tenant_status FROM vendor_users vu JOIN tenants t ON vu.tenant_id = t.id WHERE vu.email = ?', 
      [email]
    );
    
    if (!vendorUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (!vendorUser.is_active) {
      return res.status(401).json({ success: false, error: 'Account is deactivated' });
    }

    if (!vendorUser.tenant_status) {
      return res.status(401).json({ success: false, error: 'Missing tenant' });
    }

    if (vendorUser.tenant_status !== 'ACTIVE') {
      return res.status(401).json({ success: false, error: 'Tenant is inactive' });
    }

    const passwordMatch = await bcrypt.compare(tempPassword, vendorUser.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Invalid temporary password' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    await db.run(
      'UPDATE vendor_users SET password_hash = ?, must_change_password = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, vendorUser.id]
    );

    const token = jwt.sign(
      { 
        userId: vendorUser.id, 
        tenantId: vendorUser.tenant_id,
        vendorId: vendorUser.vendor_id, 
        email: vendorUser.email,
        role: vendorUser.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: vendorUser.id,
        tenantId: vendorUser.tenant_id,
        vendorId: vendorUser.vendor_id,
        email: vendorUser.email,
        role: vendorUser.role
      }
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;

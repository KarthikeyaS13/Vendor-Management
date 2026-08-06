import express from 'express';
import bcrypt from 'bcrypt';
import { getDb } from '../config/db.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/permissions.js';
import { ROLE_CONFIG } from '../config/roles.js';
import { tenantWhere, tenantAnd, getTenantId, isSuperAdmin } from '../utils/tenantQuery.js';

const router = express.Router();

router.use(authenticateToken);

// GET /api/users
router.get('/', authorize(PERMISSIONS.USERS_VIEW), async (req, res) => {
  try {
    const db = await getDb();
    const { whereClause, params } = tenantWhere(req.user);

    let query = `
      SELECT id, tenant_id, username, email, role, is_active, created_at, updated_at
      FROM users
      ${whereClause}
    `;

    if (req.query.platform === 'true') {
      if (whereClause) {
        query += ` AND tenant_id IS NULL`;
      } else {
        query += ` WHERE tenant_id IS NULL`;
      }
    } else if (req.query.tenant_only === 'true') {
      if (whereClause) {
        query += ` AND tenant_id IS NOT NULL`;
      } else {
        query += ` WHERE tenant_id IS NOT NULL`;
      }
    }

    query += ` ORDER BY created_at DESC`;

    const users = await db.all(query, params);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id
router.get('/:id', authorize(PERMISSIONS.USERS_VIEW), async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { andClause, params: tenantParams } = tenantAnd(req.user);

    let query = `
      SELECT id, tenant_id, username, email, role, is_active, created_at, updated_at
      FROM users
      WHERE id = ?${andClause}
    `;

    const user = await db.get(query, [id, ...tenantParams]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/users
router.post('/', authorize(PERMISSIONS.USERS_CREATE), async (req, res) => {
  try {
    const db = await getDb();
    const { username, email, password, role, is_active, target_tenant_id } = req.body;
    
    let tenantId = getTenantId(req.user, target_tenant_id);

    if (ROLE_CONFIG[role]?.isPlatformAdmin) {
      tenantId = null;
    } else {
      if (!tenantId) {
        if (isSuperAdmin(req.user)) {
          const defaultTenant = await db.get("SELECT id FROM tenants WHERE status = 'ACTIVE' ORDER BY id ASC LIMIT 1");
          tenantId = defaultTenant ? defaultTenant.id : 1;
        } else {
          return res.status(400).json({ error: 'Tenant context is required' });
        }
      }

      if (!isSuperAdmin(req.user) && role === 'TENANT_ADMIN') {
        return res.status(403).json({ error: 'Only SUPER_ADMIN can assign TENANT_ADMIN role' });
      }
    }

    if (role === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cannot create SUPER_ADMIN from UI' });
    }

    if (!ROLE_CONFIG[role]) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const active = is_active !== false;

    const result = await db.get(`
      INSERT INTO users (tenant_id, username, email, password_hash, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING id, tenant_id, username, email, role, is_active, created_at
    `, [tenantId, username, email, password_hash, role, active]);

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.message && (error.message.includes('unique constraint') || error.code === '23505')) {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

// PUT /api/users/:id
router.put('/:id', authorize(PERMISSIONS.USERS_EDIT), async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { username, email, role, is_active } = req.body;
    const { andClause, params: tenantParams } = tenantAnd(req.user);

    if (role === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cannot assign SUPER_ADMIN role' });
    }

    if (role && !isSuperAdmin(req.user) && role === 'TENANT_ADMIN') {
      return res.status(403).json({ error: 'Only SUPER_ADMIN can assign TENANT_ADMIN role' });
    }

    if (role && !ROLE_CONFIG[role]) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    let query = `
      UPDATE users 
      SET username = ?, email = ?, role = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?${andClause}
      RETURNING id
    `;
    let params = [username, email, role, is_active !== false, id, ...tenantParams];

    const result = await db.get(query, params);
    
    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error.message && (error.message.includes('unique constraint') || error.code === '23505')) {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
});

// PATCH /api/users/:id/status
router.patch('/:id/status', authorize(PERMISSIONS.USERS_EDIT), async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { is_active } = req.body;
    const { andClause, params: tenantParams } = tenantAnd(req.user);

    let query = `
      UPDATE users 
      SET is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?${andClause}
      RETURNING id
    `;
    let params = [is_active !== false, id, ...tenantParams];

    const result = await db.get(query, params);
    
    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'User status updated successfully' });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// POST /api/users/:id/reset-password
router.post('/:id/reset-password', authorize(PERMISSIONS.USERS_RESET_PASSWORD), async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { password } = req.body;
    const { andClause, params: tenantParams } = tenantAnd(req.user);

    const password_hash = await bcrypt.hash(password, 10);

    let query = `
      UPDATE users 
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?${andClause}
      RETURNING id
    `;
    let params = [password_hash, id, ...tenantParams];

    const result = await db.get(query, params);
    
    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', authorize(PERMISSIONS.USERS_DELETE), async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { andClause, params: tenantParams } = tenantAnd(req.user);

    // Use soft delete by setting is_active = false
    let query = `
      UPDATE users 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?${andClause}
      RETURNING id
    `;
    let params = [id, ...tenantParams];

    const result = await db.get(query, params);
    
    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;

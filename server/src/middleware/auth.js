import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'nexus_admin_secret_key_2026';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // For now, if no token, we just continue without req.user
    // This allows mixed endpoints (admin vs vendor vs public)
    // to handle authorization individually if they want.
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (!user || !user.tenantId) {
      return res.status(401).json({ error: 'Missing tenant context in token' });
    }

    // Standardize req.user for tenant-aware application
    req.user = {
      ...user,
      id: user.userId || user.id, // Support legacy id if present, or userId
      tenantId: user.tenantId,
      role: user.role,
      email: user.email || user.username
    };
    next();
  });
};

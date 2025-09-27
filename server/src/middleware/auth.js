import jwt from 'jsonwebtoken';
import pool from '../db.js';

// Main authentication middleware
export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = header.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Malformed authorization header' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { 
      id: payload.userId, 
      businessId: payload.businessId, 
      role: payload.role 
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    return res.status(401).json({ message: 'Authentication failed' });
  }
}

// Owner-only access middleware
export function ownerOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'owner') {
    return res.status(403).json({ 
      message: 'Owner access required' 
    });
  }
  
  if (!req.user.businessId) {
    return res.status(403).json({ 
      message: 'Business context required' 
    });
  }
  
  next();
}

// Staff-only access middleware
export function staffOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'staff') {
    return res.status(403).json({ 
      message: 'Staff access required' 
    });
  }
  
  next();
}

// Owner or staff from same business
export function sameBusiness(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (!req.user.businessId) {
    return res.status(403).json({ 
      message: 'Business context required' 
    });
  }
  
  next();
}

// Ensure task belongs to user's business
export async function ensureTaskBelongsToBusiness(req, res, next) {
  try {
    const taskId = req.params.id || req.body.taskId;
    
    if (!taskId) {
      return res.status(400).json({ message: 'Task ID required' });
    }

    const query = `
      SELECT id, business_id, assigned_to, status, due_date 
      FROM compliance_tasks 
      WHERE id = $1
    `;
    
    const { rows } = await pool.query(query, [taskId]);
    
    if (!rows[0]) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    if (rows[0].business_id !== req.user.businessId) {
      return res.status(403).json({ 
        message: 'Access denied: task does not belong to your business' 
      });
    }
    
    req.task = rows[0];
    next();
  } catch (error) {
    console.error('Task validation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Ensure user belongs to same business (for staff management)
export async function ensureUserBelongsToBusiness(req, res, next) {
  try {
    const userId = req.params.userId || req.body.userId;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID required' });
    }

    const query = `
      SELECT id, business_id, role, name, email 
      FROM users 
      WHERE id = $1 AND business_id = $2
    `;
    
    const { rows } = await pool.query(query, [userId, req.user.businessId]);
    
    if (!rows[0]) {
      return res.status(404).json({ 
        message: 'User not found or does not belong to your business' 
      });
    }
    
    req.targetUser = rows[0];
    next();
  } catch (error) {
    console.error('User validation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Optional: RBAC middleware for specific permissions
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Define role permissions
    const rolePermissions = {
      owner: ['create_task', 'view_task', 'edit_task', 'delete_task', 'manage_staff', 'view_reports'],
      staff: ['view_task', 'update_task_status', 'view_own_tasks']
    };

    const userPermissions = rolePermissions[req.user.role] || [];
    
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ 
        message: `Permission denied: ${permission} required` 
      });
    }

    next();
  };
}

// Business context validation middleware
export async function validateBusinessContext(req, res, next) {
  try {
    if (!req.user.businessId) {
      return res.status(400).json({ message: 'Business context required' });
    }

    // Verify business still exists and user still belongs to it
    const query = `
      SELECT b.id, b.name, u.role 
      FROM businesses b 
      JOIN users u ON u.business_id = b.id 
      WHERE u.id = $1 AND b.id = $2
    `;
    
    const { rows } = await pool.query(query, [req.user.id, req.user.businessId]);
    
    if (!rows[0]) {
      return res.status(403).json({ 
        message: 'Invalid business context or access revoked' 
      });
    }
    
    req.business = rows[0];
    next();
  } catch (error) {
    console.error('Business validation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Combined middleware exports
export default {
  authenticate,
  ownerOnly,
  staffOnly,
  sameBusiness,
  ensureTaskBelongsToBusiness,
  ensureUserBelongsToBusiness,
  requirePermission,
  validateBusinessContext
};
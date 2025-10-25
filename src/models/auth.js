import {pool} from '../config/db.js';

export const AuthModel = {
  // Create a new user
  async createUser(userData) {
    const { name, email, password_hash, role } = userData;
    const query = `
      INSERT INTO users (name, email, password_hash, role) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, name, email, role, business_id
    `;
    const result = await pool.query(query, [name, email, password_hash, role]);
    return result.rows[0];
  },

  // Create a new business
  async createBusiness(businessData) {
    const { name, owner_id } = businessData;
    const query = `
      INSERT INTO businesses (name, owner_id) 
      VALUES ($1, $2) 
      RETURNING id, name, owner_id
    `;
    const result = await pool.query(query, [name, owner_id]);
    return result.rows[0];
  },

  // Update user's business_id
  async updateUserBusinessId(userId, businessId) {
    const query = `
      UPDATE users SET business_id = $1 
      WHERE id = $2 
      RETURNING id, business_id
    `;
    const result = await pool.query(query, [businessId, userId]);
    return result.rows[0];
  },

  // Find user by email
  async findUserByEmail(email) {
    const query = `
      SELECT u.id, u.name, u.email, u.password_hash, u.role, u.business_id, b.name as business_name
      FROM users u
      LEFT JOIN businesses b ON u.business_id = b.id
      WHERE u.email = $1
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0];
  },

  // Find user by ID
  async findUserById(id) {
    const query = `
      SELECT u.id, u.name, u.email, u.role, u.business_id, b.name as business_name
      FROM users u
      LEFT JOIN businesses b ON u.business_id = b.id
      WHERE u.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  // Blacklist a token
  async blacklistToken(token, expiresAt) {
    const query = `
      INSERT INTO blacklisted_tokens (token, expires_at) 
      VALUES ($1, $2) 
      ON CONFLICT (token) DO NOTHING
    `;
    await pool.query(query, [token, expiresAt]);
  },

  // Check if token is blacklisted
  async isTokenBlacklisted(token) {
    const query = 'SELECT id FROM blacklisted_tokens WHERE token = $1';
    const result = await pool.query(query, [token]);
    return result.rows.length > 0;
  }
};
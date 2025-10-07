import {pool} from '../config/db.js';

export const StaffModel = {
  // Check if email already exists
  async checkEmailExists(email) {
    const query = 'SELECT id FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  },

  // Create staff user
  async createStaff(userData) {
    const { name, email, password_hash, business_id } = userData;
    const query = `
      INSERT INTO users (name, email, password_hash, role, business_id) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING id, name, email, role, business_id, created_at
    `;
    const result = await pool.query(query, [
      name, 
      email, 
      password_hash, 
      'staff', 
      business_id
    ]);
    return result.rows[0];
  },

  // Get staff by business ID
  async getStaffByBusiness(businessId) {
    const query = `
      SELECT id, name, email, role, created_at 
      FROM users 
      WHERE business_id = $1 AND role = 'staff'
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [businessId]);
    return result.rows;
  },

  // Get staff member by ID and business ID
  async getStaffById(staffId, businessId) {
    const query = `
      SELECT id, name, email, role, created_at 
      FROM users 
      WHERE id = $1 AND business_id = $2 AND role = 'staff'
    `;
    const result = await pool.query(query, [staffId, businessId]);
    return result.rows[0];
  }
};
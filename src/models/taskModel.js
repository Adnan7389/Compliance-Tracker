import { pool } from '../config/db.js';

export const TaskModel = {
  // Validate staff assignment
  async validateStaffAssignment(staffId, businessId) {
    const query = `
      SELECT id FROM users 
      WHERE id = $1 AND business_id = $2 AND role = 'staff'
    `;
    const result = await pool.query(query, [staffId, businessId]);
    return result.rows[0];
  },

  // Create task
  async createTask(taskData) {
    const {
      business_id,
      assigned_to,
      title,
      description,
      category,
      due_date,
      recurrence,
      created_by
    } = taskData;

    const query = `
      INSERT INTO compliance_tasks 
      (business_id, assigned_to, title, description, category, due_date, recurrence, created_by) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      business_id,
      assigned_to,
      title,
      description,
      category,
      due_date,
      recurrence || 'none',
      created_by
    ]);
    
    return result.rows[0];
  },

  // Get tasks for owner (all business tasks)
  async getTasksForOwner(businessId, filters = {}) {
    let query = `
      SELECT 
        ct.*,
        u.name as assigned_to_name,
        u.email as assigned_to_email
      FROM compliance_tasks ct
      LEFT JOIN users u ON ct.assigned_to = u.id
      WHERE ct.business_id = $1
    `;
    const params = [businessId];
    let paramCount = 1;

    // Apply filters
    if (filters.status) {
      paramCount++;
      query += ` AND ct.status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.assigned_to) {
      paramCount++;
      query += ` AND ct.assigned_to = $${paramCount}`;
      params.push(filters.assigned_to);
    }

    if (filters.overdue === 'true') {
      query += ` AND ct.due_date < CURRENT_DATE AND ct.status != 'completed'`;
    }

    query += ` ORDER BY ct.due_date, ct.created_at DESC`;
    
    const result = await pool.query(query, params);
    return result.rows;
  },

  // Get tasks for staff (only assigned tasks)
  async getTasksForStaff(staffId, filters = {}) {
    let query = `
      SELECT 
        ct.*,
        u.name as assigned_to_name,
        u.email as assigned_to_email
      FROM compliance_tasks ct
      LEFT JOIN users u ON ct.assigned_to = u.id
      WHERE ct.assigned_to = $1
    `;
    const params = [staffId];
    let paramCount = 1;

    if (filters.status) {
      paramCount++;
      query += ` AND ct.status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.overdue === 'true') {
      query += ` AND ct.due_date < CURRENT_DATE AND ct.status != 'completed'`;
    }

    query += ` ORDER BY ct.due_date, ct.created_at DESC`;
    
    const result = await pool.query(query, params);
    return result.rows;
  },

  // Get task by ID with business validation
  async getTaskById(taskId, businessId) {
    const query = `
      SELECT 
        ct.*,
        u.name as assigned_to_name,
        u.email as assigned_to_email,
        creator.name as created_by_name
      FROM compliance_tasks ct
      LEFT JOIN users u ON ct.assigned_to = u.id
      LEFT JOIN users creator ON ct.created_by = creator.id
      WHERE ct.id = $1 AND ct.business_id = $2
    `;
    const result = await pool.query(query, [taskId, businessId]);
    return result.rows[0];
  },

  // Update task with role-based field validation
  async updateTask(taskId, updates, allowedFields) {
    const fields = [];
    const values = [];
    let paramCount = 0;

    // Only include allowed fields
    Object.keys(updates).forEach(field => {
      if (allowedFields.includes(field)) {
        // Handle empty strings for timestamp fields by converting to null
        const value = (field.endsWith('_at') || field === 'due_date') && updates[field] === '' 
          ? null 
          : updates[field];
          
        paramCount++;
        fields.push(`${field} = $${paramCount}`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    paramCount++;
    values.push(taskId);

    const query = `
      UPDATE compliance_tasks 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // Delete task
  async deleteTask(taskId, businessId) {
    const query = `
      DELETE FROM compliance_tasks 
      WHERE id = $1 AND business_id = $2
      RETURNING id
    `;
    const result = await pool.query(query, [taskId, businessId]);
    return result.rows[0];
  },

  // Helper to calculate next due date based on recurrence
  calculateNextDueDate(currentDueDate, recurrence) {
    const date = new Date(currentDueDate);
    switch (recurrence) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        return null; // No recurrence or unknown type
    }
    return date.toISOString().split('T')[0]; // Return in YYYY-MM-DD format
  },

  // Create next recurrence of a task
  async createNextRecurrenceTask(previousTask) {
    const {
      business_id,
      assigned_to,
      title,
      description,
      category,
      due_date,
      recurrence,
      created_by
    } = previousTask;

    if (!recurrence || recurrence === 'none') {
      return null; // Not a recurring task
    }

    const nextDueDate = this.calculateNextDueDate(due_date, recurrence);

    if (!nextDueDate) {
      return null; // Could not calculate next due date
    }

    const newTaskData = {
      business_id,
      assigned_to,
      title,
      description,
      category,
      due_date: nextDueDate,
      recurrence,
      created_by,
      status: 'pending' // New recurring task starts as pending
    };

    return this.createTask(newTaskData);
  }
};
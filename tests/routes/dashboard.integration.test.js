import request from 'supertest';
import { app } from '../../src/app.js';
import { pool } from '../../src/config/db.js';
import * as bcrypt from 'bcrypt';

describe('Dashboard Routes - Integration', () => {
  let ownerToken;
  let businessId;
  let ownerId;

  beforeAll(async () => {
    await pool.query('TRUNCATE TABLE users, businesses, compliance_tasks, documents RESTART IDENTITY CASCADE;');

    const ownerPassword = await bcrypt.hash('password123', 10);
    const ownerRes = await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ('Test Owner', 'owner@dashboardtest.com', $1, 'owner') RETURNING id",
      [ownerPassword]
    );
    ownerId = ownerRes.rows[0].id;

    const businessRes = await pool.query(
      "INSERT INTO businesses (name, owner_id) VALUES ('Dashboard Test Business', $1) RETURNING id",
      [ownerId]
    );
    businessId = businessRes.rows[0].id;

    await pool.query('UPDATE users SET business_id = $1 WHERE id = $2', [businessId, ownerId]);

    // Create some tasks for the dashboard
    await pool.query(
      "INSERT INTO compliance_tasks (business_id, created_by, title, description, category, due_date, status) VALUES ($1, $2, 'Task 1', 'Desc 1', 'tax', '2025-12-31', 'pending')",
      [businessId, ownerId]
    );
    await pool.query(
      "INSERT INTO compliance_tasks (business_id, created_by, title, description, category, due_date, status) VALUES ($1, $2, 'Task 2', 'Desc 2', 'safety', '2025-11-15', 'completed')",
      [businessId, ownerId]
    );
    await pool.query(
      "INSERT INTO compliance_tasks (business_id, created_by, title, description, category, due_date, status) VALUES ($1, $2, 'Task 3', 'Desc 3', 'other', '2024-01-01', 'pending')", // Overdue
      [businessId, ownerId]
    );
  });

  beforeEach(async () => {
    const ownerLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@dashboardtest.com', password: 'password123' });
    ownerToken = ownerLoginRes.body.token;
  });

  describe('GET /api/dashboard', () => {
    it('should return complete dashboard data for an authenticated owner', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.stats).toHaveProperty('total_tasks');
      expect(res.body.data.stats).toHaveProperty('completed_tasks');
      expect(res.body.data.stats).toHaveProperty('pending_tasks');
      expect(res.body.data.stats).toHaveProperty('overdue_tasks');
      expect(res.body.data).toHaveProperty('task_distribution');
      expect(res.body.data).toHaveProperty('recent_activity');
      expect(res.body.data.stats.total_tasks).toBe(3);
      expect(res.body.data.stats.completed_tasks).toBe(1);
      expect(res.body.data.stats.pending_tasks).toBe(2);
      expect(res.body.data.stats.overdue_tasks).toBe(1);
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .get('/api/dashboard');

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('No token provided');
    });
  });

  describe('GET /api/dashboard/stats', () => {
    it('should return only statistics for an authenticated owner', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.stats).toHaveProperty('total_tasks');
      expect(res.body.stats).toHaveProperty('completed_tasks');
      expect(res.body.stats).toHaveProperty('pending_tasks');
      expect(res.body.stats).toHaveProperty('overdue_tasks');
      expect(res.body).not.toHaveProperty('tasksByCategory');
      expect(res.body).not.toHaveProperty('recent_activity');
      expect(res.body.stats.total_tasks).toBe(3);
      expect(res.body.stats.completed_tasks).toBe(1);
      expect(res.body.stats.pending_tasks).toBe(2);
      expect(res.body.stats.overdue_tasks).toBe(1);
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats');

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('No token provided');
    });
  });
});

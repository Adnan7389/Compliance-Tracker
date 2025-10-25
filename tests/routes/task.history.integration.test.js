import request from 'supertest';
import { app } from '../../src/app.js';
import { pool } from '../../src/config/db.js';
import * as bcrypt from 'bcrypt';
import { format, addMonths, addYears } from 'date-fns';

describe('Task History Routes - Integration', () => {
  let ownerToken;
  let staffToken;
  let businessId;
  let ownerId;
  let staffId;
  let taskId;

  beforeAll(async () => {
    await pool.query('TRUNCATE TABLE users, businesses, compliance_tasks, documents, task_history RESTART IDENTITY CASCADE;');

    const ownerPassword = await bcrypt.hash('password123', 10);
    const ownerRes = await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ('Test Owner', 'owner@tasktest.com', $1, 'owner') RETURNING id",
      [ownerPassword]
    );
    ownerId = ownerRes.rows[0].id;

    const businessRes = await pool.query(
      "INSERT INTO businesses (name, owner_id) VALUES ('Task Test Business', $1) RETURNING id",
      [ownerId]
    );
    businessId = businessRes.rows[0].id;

    await pool.query('UPDATE users SET business_id = $1 WHERE id = $2', [businessId, ownerId]);

    const staffPassword = await bcrypt.hash('password123', 10);
    const staffRes = await pool.query(
      "INSERT INTO users (name, email, password_hash, role, business_id) VALUES ('Test Staff', 'staff@tasktest.com', $1, 'staff', $2) RETURNING id",
      [staffPassword, businessId]
    );
    staffId = staffRes.rows[0].id;
  });

  beforeEach(async () => {
    const ownerLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@tasktest.com', password: 'password123' });
    ownerToken = ownerLoginRes.headers['set-cookie'];

    const staffLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff@tasktest.com', password: 'password123' });
    staffToken = staffLoginRes.headers['set-cookie'];

    const taskRes = await pool.query(
      "INSERT INTO compliance_tasks (business_id, created_by, assigned_to, title, description, category, due_date, recurrence) VALUES ($1, $2, $3, 'Test Task', 'Test Description', 'other', '2025-12-31', 'monthly') RETURNING id",
      [businessId, ownerId, staffId]
    );
    taskId = taskRes.rows[0].id;
  });

  afterEach(async () => {
    await pool.query('TRUNCATE TABLE compliance_tasks, task_history RESTART IDENTITY CASCADE;');
  });

  describe('GET /api/tasks/:id/history', () => {
    it('should return the history of a task', async () => {
      // Complete the task once
      await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Cookie', ownerToken)
        .send({ status: 'completed' });

      // Complete the task again
      await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Cookie', ownerToken)
        .send({ status: 'completed' });

      const res = await request(app)
        .get(`/api/tasks/${taskId}/history`)
        .set('Cookie', ownerToken);

      expect(res.statusCode).toEqual(200);
      expect(res.body.history.length).toBe(2);
      expect(res.body.history[0].completed_by_name).toEqual('Test Staff');
    });

    it('should not allow a staff member to view the history of a task not assigned to them', async () => {
      // Create a new task that is not assigned to the staff member
      const newTaskRes = await pool.query(
        "INSERT INTO compliance_tasks (business_id, created_by, title, description, category, due_date, recurrence) VALUES ($1, $2, 'Another Task', 'Another Description', 'other', '2025-12-31', 'monthly') RETURNING id",
        [businessId, ownerId]
      );
      const newTaskId = newTaskRes.rows[0].id;

      const res = await request(app)
        .get(`/api/tasks/${newTaskId}/history`)
        .set('Cookie', staffToken);

      expect(res.statusCode).toEqual(403);
    });
  });
});

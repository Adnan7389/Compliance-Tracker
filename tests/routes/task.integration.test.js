import request from 'supertest';
import { app } from '../../src/app.js';
import { pool } from '../../src/config/db.js';
import * as bcrypt from 'bcrypt';

describe('Task Routes - Integration', () => {
  let ownerToken;
  let staffToken;
  let businessId;
  let ownerId;
  let staffId;
  let taskId;

  beforeAll(async () => {
    await pool.query('TRUNCATE TABLE users, businesses, compliance_tasks, documents RESTART IDENTITY CASCADE;');

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
    ownerToken = ownerLoginRes.body.token;

    const staffLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff@tasktest.com', password: 'password123' });
    staffToken = staffLoginRes.body.token;

    const taskRes = await pool.query(
      "INSERT INTO compliance_tasks (business_id, created_by, title, description, category, due_date) VALUES ($1, $2, 'Test Task', 'Test Description', 'other', '2025-12-31') RETURNING id",
      [businessId, ownerId]
    );
    taskId = taskRes.rows[0].id;
  });

  afterEach(async () => {
    await pool.query('TRUNCATE TABLE compliance_tasks RESTART IDENTITY CASCADE;');
  });



  describe('POST /api/tasks', () => {
    it('should allow an owner to create a task', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'New Task',
          description: 'New Description',
          category: 'tax',
          due_date: '2026-01-01',
          assigned_to: staffId,
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body.task.title).toEqual('New Task');
    });

    it('should not allow staff to create a task', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ title: 'Staff Task', category: 'other', due_date: '2026-01-01' });
      expect(res.statusCode).toEqual(403);
    });
  });

  describe('GET /api/tasks', () => {
    it('should allow an owner to get all tasks', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.tasks.length).toBeGreaterThan(0);
    });

    it('should allow staff to get their assigned tasks', async () => {
      await pool.query('UPDATE compliance_tasks SET assigned_to = $1 WHERE id = $2', [staffId, taskId]);
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.tasks.length).toBeGreaterThan(0);
      expect(res.body.tasks[0].assigned_to).toEqual(staffId);
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should allow an owner to get a task by id', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.task.id).toEqual(taskId);
    });

    it('should not allow staff to get a task not assigned to them', async () => {
        const res = await request(app)
            .get(`/api/tasks/${taskId}`)
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.statusCode).toEqual(403);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should allow an owner to update a task', async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Updated Task Title' });
      expect(res.statusCode).toEqual(200);
      expect(res.body.task.title).toEqual('Updated Task Title');
    });

    it('should allow staff to update a task assigned to them', async () => {
        await pool.query('UPDATE compliance_tasks SET assigned_to = $1 WHERE id = $2', [staffId, taskId]);
        const res = await request(app)
            .put(`/api/tasks/${taskId}`)
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ status: 'completed' });
        expect(res.statusCode).toEqual(200);
        expect(res.body.task.status).toEqual('completed');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should allow an owner to delete a task', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('Task deleted successfully');
    });

    it('should not allow staff to delete a task', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res.statusCode).toEqual(403);
    });
  });
});

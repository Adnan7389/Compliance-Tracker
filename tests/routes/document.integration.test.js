import request from 'supertest';
import { app } from '../../src/app.js';
import { pool } from '../../src/config/db.js';
import * as bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

describe('Document Routes - Integration', () => {
  let ownerToken;
  let businessId;
  let ownerId;
  let taskId;
  let documentId;
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const testFilePath = path.join(__dirname, 'test-file.txt');

  beforeAll(async () => {
    // Create a dummy file for testing uploads
    fs.writeFileSync(testFilePath, 'This is a test file.');

    await pool.query('TRUNCATE TABLE users, businesses, compliance_tasks, documents RESTART IDENTITY CASCADE;');

    const ownerPassword = await bcrypt.hash('password123', 10);
    const ownerRes = await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ('Test Owner', 'owner@doctest.com', $1, 'owner') RETURNING id",
      [ownerPassword]
    );
    ownerId = ownerRes.rows[0].id;

    const businessRes = await pool.query(
      "INSERT INTO businesses (name, owner_id) VALUES ('Doc Test Business', $1) RETURNING id",
      [ownerId]
    );
    businessId = businessRes.rows[0].id;

    await pool.query('UPDATE users SET business_id = $1 WHERE id = $2', [businessId, ownerId]);
  });

  beforeEach(async () => {
    const ownerLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@doctest.com', password: 'password123' });
    ownerToken = ownerLoginRes.body.token;

    const taskRes = await pool.query(
      "INSERT INTO compliance_tasks (business_id, created_by, title, description, category, due_date) VALUES ($1, $2, 'Doc Test Task', 'Test Description', 'other', '2025-12-31') RETURNING id",
      [businessId, ownerId]
    );
    taskId = taskRes.rows[0].id;
  });

  afterEach(async () => {
    await pool.query('TRUNCATE TABLE documents RESTART IDENTITY CASCADE;');
  });

  describe('POST /api/tasks/:id/documents', () => {
    it('should upload a document to a task', async () => {
      const res = await request(app)
        .post(`/api/tasks/${taskId}/documents`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', testFilePath);

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toEqual('File uploaded successfully');
      expect(res.body.document).toHaveProperty('id');
      documentId = res.body.document.id;
    });
  });

  describe('GET /api/tasks/:id/documents', () => {
    it('should get documents for a task', async () => {
        // First upload a document to have something to fetch
        await request(app)
            .post(`/api/tasks/${taskId}/documents`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .attach('file', testFilePath);

        const res = await request(app)
            .get(`/api/tasks/${taskId}/documents`)
            .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body.documents)).toBe(true);
        expect(res.body.documents.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/documents/:id/download', () => {
    it('should download a document', async () => {
        const uploadRes = await request(app)
            .post(`/api/tasks/${taskId}/documents`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .attach('file', testFilePath);
        const docId = uploadRes.body.document.id;

        const res = await request(app)
            .get(`/api/documents/${docId}/download`)
            .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.headers['content-disposition']).toContain('attachment; filename="test-file.txt"');
    });
  });

  describe('DELETE /api/documents/:id', () => {
    it('should delete a document', async () => {
        const uploadRes = await request(app)
            .post(`/api/tasks/${taskId}/documents`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .attach('file', testFilePath);
        const docId = uploadRes.body.document.id;

        const res = await request(app)
            .delete(`/api/documents/${docId}`)
            .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toEqual('Document deleted successfully');
    });
  });
});

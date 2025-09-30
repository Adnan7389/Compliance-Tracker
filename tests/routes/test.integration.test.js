import { jest } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/app.js';
import { pool } from '../../src/config/db.js';
import * as bcrypt from 'bcrypt';
import emailService from '../../src/services/emailService.js'; // Import the actual service

describe('Test Routes - Integration', () => {
  let ownerToken;
  let staffToken;
  let businessId;
  let ownerId;
  let staffId;

  let verifyConnectionSpy;
  let sendMailSpy;

  beforeAll(async () => {
    await pool.query('TRUNCATE TABLE users, businesses, compliance_tasks, documents RESTART IDENTITY CASCADE;');

    const ownerPassword = await bcrypt.hash('password123', 10);
    const ownerRes = await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ('Test Owner', 'owner@testroutes.com', $1, 'owner') RETURNING id",
      [ownerPassword]
    );
    ownerId = ownerRes.rows[0].id;

    const businessRes = await pool.query(
      "INSERT INTO businesses (name, owner_id) VALUES ('Test Routes Business', $1) RETURNING id",
      [ownerId]
    );
    businessId = businessRes.rows[0].id;

    await pool.query('UPDATE users SET business_id = $1 WHERE id = $2', [businessId, ownerId]);

    const staffPassword = await bcrypt.hash('password123', 10);
    const staffRes = await pool.query(
      "INSERT INTO users (name, email, password_hash, role, business_id) VALUES ('Test Staff', 'staff@testroutes.com', $1, 'staff', $2) RETURNING id",
      [staffPassword, businessId]
    );
    staffId = staffRes.rows[0].id;
  });

  beforeEach(async () => {
    // Spy on the actual emailService functions
    verifyConnectionSpy = jest.spyOn(emailService, 'verifyConnection').mockResolvedValue(true);
    sendMailSpy = jest.spyOn(emailService, 'sendMail').mockResolvedValue(true);

    const ownerLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@testroutes.com', password: 'password123' });
    ownerToken = ownerLoginRes.body.token;

    const staffLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff@testroutes.com', password: 'password123' });
    staffToken = staffLoginRes.body.token;
  });

  afterEach(() => {
    // Restore the original implementations after each test
    verifyConnectionSpy.mockRestore();
    sendMailSpy.mockRestore();
  });

  describe('POST /api/test/reminders', () => {
    it('should allow an owner to trigger reminders', async () => {
      const res = await request(app)
        .post('/api/test/reminders')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('Reminders triggered manually');
    });

    it('should not allow staff to trigger reminders', async () => {
      const res = await request(app)
        .post('/api/test/reminders')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toEqual('Owner access required');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/test/reminders');

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('No token provided');
    });
  });

  describe('POST /api/test/email', () => {
    it('should allow an owner to send a test email', async () => {
      const res = await request(app)
        .post('/api/test/email')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'test@example.com' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('Test email sent successfully');
    });

    it('should not allow staff to send a test email', async () => {
      const res = await request(app)
        .post('/api/test/email')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toEqual('Owner access required');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/test/email');

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('No token provided');
    });
  });
});

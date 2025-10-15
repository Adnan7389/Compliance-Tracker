import request from 'supertest';
import { app } from '../../src/app.js';
import { pool } from '../../src/config/db.js';

describe('Auth Routes - Integration', () => {
  let token;

  beforeAll(async () => {
    // Clean up the database before all tests
    await pool.query('TRUNCATE TABLE users, businesses, blacklisted_tokens, compliance_tasks, documents RESTART IDENTITY CASCADE;');
  });

  describe('POST /api/auth/logout', () => {
    beforeEach(async () => {
      // Register and login a user to get a token
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          businessName: 'Test Business',
        });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      token = res.headers['set-cookie'];
    });

    afterEach(async () => {
      // Clean up the database after each test
      await pool.query('TRUNCATE TABLE users, businesses, blacklisted_tokens, compliance_tasks, documents RESTART IDENTITY CASCADE;');
    });

    it('should logout the user and blacklist the token', async () => {
      // Logout the user
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', token);

      expect(logoutRes.statusCode).toEqual(200);
      expect(logoutRes.body.message).toEqual('Logout successful');

      // Try to access a protected route with the blacklisted token
      const profileRes = await request(app)
        .get('/api/auth/profile')
        .set('Cookie', token);

      expect(profileRes.statusCode).toEqual(401);
      expect(profileRes.body.message).toEqual('Token is invalid');
    });
  });
});

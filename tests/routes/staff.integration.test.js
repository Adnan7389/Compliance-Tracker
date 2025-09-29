import request from 'supertest';
import { app } from '../../src/app.js';
import { pool } from '../../src/config/db.js';
import * as bcrypt from 'bcrypt';

describe('Staff Routes - Integration', () => {
    let ownerToken;
    let businessId;
    let ownerId;
  
    beforeEach(async () => {
      // Clean up and setup a test owner
      await pool.query('TRUNCATE TABLE users, businesses, compliance_tasks, documents RESTART IDENTITY CASCADE;');
      
      const password_hash = await bcrypt.hash('password123', 10);
      const ownerRes = await pool.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ('Test Owner', 'owner@test.com', $1, 'owner') RETURNING id",
        [password_hash]
      );
      ownerId = ownerRes.rows[0].id;
  
      const businessRes = await pool.query(
        "INSERT INTO businesses (name, owner_id) VALUES ('Test Business', $1) RETURNING id",
        [ownerId]
      );
      businessId = businessRes.rows[0].id;
  
      await pool.query('UPDATE users SET business_id = $1 WHERE id = $2', [businessId, ownerId]);
  
      // Login as owner to get a token
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'owner@test.com',
          password: 'password123',
        });
      ownerToken = res.body.token;
    });
  
    afterEach(async () => {
      await pool.query('TRUNCATE TABLE users, businesses, compliance_tasks, documents RESTART IDENTITY CASCADE;');
    });
  
    describe('POST /api/staff', () => {    it('should allow an owner to create a new staff member', async () => {
      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Test Staff',
          email: 'staff@test.com',
          password: 'Password123',
        });
      
      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toEqual('Staff member created successfully');
      expect(res.body.staff).toHaveProperty('id');
      expect(res.body.staff.name).toEqual('Test Staff');
      expect(res.body.staff.email).toEqual('staff@test.com');
      expect(res.body.staff.role).toEqual('staff');
      expect(res.body.staff.business_id).toEqual(businessId);
    });

    it('should not allow a non-owner to create a new staff member', async () => {
        // Create a staff user and get a token
        const password_hash = await bcrypt.hash('password123', 10);
        await pool.query(
            "INSERT INTO users (name, email, password_hash, role, business_id) VALUES ('Test Staff', 'staff1@test.com', $1, 'staff', $2)",
            [password_hash, businessId]
        );
        const resLogin = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'staff1@test.com',
                password: 'password123',
            });
        const staffToken = resLogin.body.token;

        const res = await request(app)
            .post('/api/staff')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({
                name: 'Another Staff',
                email: 'staff2@test.com',
                password: 'password123',
            });

        expect(res.statusCode).toEqual(403);
        expect(res.body.message).toEqual('Owner access required');
    });
  });

  describe('GET /api/staff', () => {
    it('should allow an owner to get a list of staff members', async () => {
      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('staff');
      expect(Array.isArray(res.body.staff)).toBe(true);
    });
  });

  describe('GET /api/staff/:staffId', () => {
    let staffId;
    beforeEach(async () => {
        // Create a staff user to be fetched
        const password_hash = await bcrypt.hash('password123', 10);
        const staffRes = await pool.query(
            "INSERT INTO users (name, email, password_hash, role, business_id) VALUES ('Specific Staff', 'specific.staff@test.com', $1, 'staff', $2) RETURNING id",
            [password_hash, businessId]
        );
        staffId = staffRes.rows[0].id;
    });

    it('should allow an owner to get a specific staff member', async () => {
      const res = await request(app)
        .get(`/api/staff/${staffId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.staff).toHaveProperty('id', staffId);
      expect(res.body.staff.name).toEqual('Specific Staff');
      expect(res.body.staff.email).toEqual('specific.staff@test.com');
    });

    it('should return 404 if staff member does not exist', async () => {
        const nonExistentStaffId = 9999;
        const res = await request(app)
            .get(`/api/staff/${nonExistentStaffId}`)
            .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.statusCode).toEqual(404);
        expect(res.body.message).toEqual('User not found or does not belong to your business');
    });
  });
});

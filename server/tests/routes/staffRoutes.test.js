import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock middleware
jest.unstable_mockModule('../../src/middleware/auth.js', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 1, businessId: 1, role: 'owner' };
    next();
  }),
  ownerOnly: jest.fn((req, res, next) => next()),
  ensureUserBelongsToBusiness: jest.fn((req, res, next) => next())
}));

// Mock controller
jest.unstable_mockModule('../../src/controllers/staffController.js', () => ({
  staffController: {
    createStaff: jest.fn((req, res) => res.status(201).json({ 
      message: 'Staff created',
      staff: { id: 1, name: 'Test Staff', email: 'test@test.com' }
    })),
    getStaff: jest.fn((req, res) => res.json({ 
      staff: [], 
      count: 0 
    }))
  }
}));

describe('Staff Routes', () => {
  let app;

  beforeAll(async () => {
    const { default: staffRoutes } = await import('../../src/routes/staffRoutes.js');
    app = express();
    app.use(express.json());
    app.use('/staff', staffRoutes);
  });

  describe('POST /staff', () => {
    it('should create staff with valid data', async () => {
      const staffData = {
        name: 'Test Staff',
        email: 'test@test.com',
        password: 'Password123'
      };

      const response = await request(app)
        .post('/staff')
        .send(staffData)
        .expect(201);

      expect(response.body.message).toBe('Staff created');
    });

    it('should return 400 with invalid data', async () => {
      const invalidData = {
        name: 'T', // Too short
        email: 'invalid-email',
        password: '123' // Too short
      };

      const response = await request(app)
        .post('/staff')
        .send(invalidData)
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /staff', () => {
    it('should return staff list', async () => {
      const response = await request(app)
        .get('/staff')
        .expect(200);

      expect(response.body).toHaveProperty('staff');
      expect(response.body).toHaveProperty('count');
    });
  });
});
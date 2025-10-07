import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock dependencies
jest.unstable_mockModule('../../src/controllers/authController.js', () => ({
  authController: {
    register: jest.fn(),
    login: jest.fn(),
    getProfile: jest.fn(),
  },
}));

const createChainableMiddleware = () => {
  const middleware = (req, res, next) => next();
  
  Object.assign(middleware, {
    trim: jest.fn().mockReturnValue(middleware),
    isLength: jest.fn().mockReturnValue(middleware),
    withMessage: jest.fn().mockReturnValue(middleware),
    isEmail: jest.fn().mockReturnValue(middleware),
    normalizeEmail: jest.fn().mockReturnValue(middleware),
    notEmpty: jest.fn().mockReturnValue(middleware),
    matches: jest.fn().mockReturnValue(middleware),
    optional: jest.fn().mockReturnValue(middleware),
    isIn: jest.fn().mockReturnValue(middleware),
    isISO8601: jest.fn().mockReturnValue(middleware),
    custom: jest.fn().mockReturnValue(middleware),
    isInt: jest.fn().mockReturnValue(middleware),
  });

  return middleware;
};

jest.unstable_mockModule('express-validator', () => ({
  validationResult: jest.fn(),
  body: jest.fn(() => createChainableMiddleware()),
  param: jest.fn(() => createChainableMiddleware()),
  query: jest.fn(() => createChainableMiddleware()),
}));

jest.unstable_mockModule('../../src/middleware/auth.js', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.userId = 1; // Mock authenticated user
    next();
  }),
}));

describe('Auth Routes', () => {
  let app;
  let authController;
  let authenticate;
  let validationResult;

  beforeAll(async () => {
    const authControllerModule = await import('../../src/controllers/authController.js');
    authController = authControllerModule.authController;

    const expressValidatorModule = await import('express-validator');
    validationResult = expressValidatorModule.validationResult;

    const authMiddlewareModule = await import('../../src/middleware/auth.js');
    authenticate = authMiddlewareModule.authenticate;

    const routesModule = await import('../../src/routes/authRoutes.js');
    const authRoutes = routesModule.default;

    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock validationResult to return no errors by default
    validationResult.mockImplementation(() => ({
      isEmpty: () => true,
      array: () => [],
    }));
    authenticate.mockImplementation((req, res, next) => {
      req.userId = 1;
      next();
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new owner successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        businessName: 'Test Business',
      };
      authController.register.mockImplementation((req, res) => {
        res.status(201).json({ message: 'Owner registered successfully' });
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toEqual('Owner registered successfully');
      expect(authController.register).toHaveBeenCalled();
    });

    it('should return 400 on validation failure', async () => {
      // Override validationResult mock for this specific test
      validationResult.mockImplementation(() => ({
        isEmpty: () => false,
        array: () => ['email is required'],
      }));

      const res = await request(app)
        .post('/api/auth/register')
        .send({}); // Empty body to trigger validation error

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('Validation failed');
      expect(authController.register).not.toHaveBeenCalled();
    });

    it('should return 409 if user already exists', async () => {
      const userData = {
        name: 'Test User',
        email: 'existing@example.com',
        password: 'password123',
        businessName: 'Test Business',
      };
      authController.register.mockImplementation((req, res) => {
        res.status(409).json({ message: 'User already exists with this email' });
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.statusCode).toEqual(409);
      expect(res.body.message).toEqual('User already exists with this email');
      expect(authController.register).toHaveBeenCalled();
    });

    it('should return 500 on server error', async () => {
      const userData = {
        name: 'Test User',
        email: 'error@example.com',
        password: 'password123',
        businessName: 'Test Business',
      };
      authController.register.mockImplementation((req, res) => {
        res.status(500).json({ message: 'Internal server error during registration' });
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.statusCode).toEqual(500);
      expect(res.body.message).toEqual('Internal server error during registration');
      expect(authController.register).toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
      };
      authController.login.mockImplementation((req, res) => {
        res.json({ message: 'Login successful', token: 'test_token' });
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send(userData);

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('Login successful');
      expect(authController.login).toHaveBeenCalled();
    });

    it('should return 400 on validation failure', async () => {
      // Override validationResult mock for this specific test
      validationResult.mockImplementation(() => ({
        isEmpty: () => false,
        array: () => ['email is required'],
      }));

      const res = await request(app)
        .post('/api/auth/login')
        .send({}); // Empty body to trigger validation error

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('Validation failed');
      expect(authController.login).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid credentials', async () => {
      const userData = {
        email: 'invalid@example.com',
        password: 'wrongpassword',
      };
      authController.login.mockImplementation((req, res) => {
        res.status(401).json({ message: 'Invalid credentials' });
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send(userData);

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('Invalid credentials');
      expect(authController.login).toHaveBeenCalled();
    });

    it('should return 500 on server error', async () => {
      const userData = {
        email: 'error@example.com',
        password: 'password123',
      };
      authController.login.mockImplementation((req, res) => {
        res.status(500).json({ message: 'Internal server error during login' });
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send(userData);

      expect(res.statusCode).toEqual(500);
      expect(res.body.message).toEqual('Internal server error during login');
      expect(authController.login).toHaveBeenCalled();
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return user profile successfully', async () => {
      authController.getProfile.mockImplementation((req, res) => {
        res.json({ user: { id: 1, name: 'Test User' } });
      });

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer test_token');

      expect(res.statusCode).toEqual(200);
      expect(res.body.user.id).toEqual(1);
      expect(authenticate).toHaveBeenCalled();
      expect(authController.getProfile).toHaveBeenCalled();
    });

    it('should return 401 if authentication fails', async () => {
      // Override authenticate mock for this specific test
      authenticate.mockImplementation((req, res, next) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      const res = await request(app)
        .get('/api/auth/profile');

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('Unauthorized');
      expect(authenticate).toHaveBeenCalled();
      expect(authController.getProfile).not.toHaveBeenCalled();
    });

    it('should return 404 if user not found', async () => {
      authController.getProfile.mockImplementation((req, res) => {
        res.status(404).json({ message: 'User not found' });
      });

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer test_token');

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toEqual('User not found');
      expect(authenticate).toHaveBeenCalled();
      expect(authController.getProfile).toHaveBeenCalled();
    });

    it('should return 500 on server error', async () => {
      authController.getProfile.mockImplementation((req, res) => {
        res.status(500).json({ message: 'Internal server error' });
      });

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer test_token');

      expect(res.statusCode).toEqual(500);
      expect(res.body.message).toEqual('Internal server error');
      expect(authenticate).toHaveBeenCalled();
      expect(authController.getProfile).toHaveBeenCalled();
    });
  });
});
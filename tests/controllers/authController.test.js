import { jest } from '@jest/globals';

// Mock dependencies using jest.unstable_mockModule
jest.unstable_mockModule('../../src/models/auth.js', () => ({
  AuthModel: {
    findUserByEmail: jest.fn(),
    createUser: jest.fn(),
    createBusiness: jest.fn(),
    updateUserBusinessId: jest.fn(),
    findUserById: jest.fn(),
    blacklistToken: jest.fn(),
    isTokenBlacklisted: jest.fn(),
  }
}));

jest.unstable_mockModule('express-validator', () => ({
  validationResult: jest.fn(),
}));

jest.unstable_mockModule('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    sign: jest.fn(),
    decode: jest.fn(),
    verify: jest.fn(),
  },
}));

describe('Auth Controller', () => {
  let authController;
  let AuthModel;
  let expressValidator;
  let bcrypt;
  let jwt;
  let req, res;

  beforeAll(async () => {
    // Dynamically import modules after mocks are set up
    const controllerModule = await import('../../src/controllers/authController.js');
    authController = controllerModule.authController;

    const authModelModule = await import('../../src/models/auth.js');
    AuthModel = authModelModule.AuthModel;

    const expressValidatorModule = await import('express-validator');
    expressValidator = expressValidatorModule;

    // Get the mocked bcrypt module
    const mockedBcrypt = await import('bcrypt');
    bcrypt = mockedBcrypt;

    const jwtModule = await import('jsonwebtoken');
    jwt = jwtModule;
  });

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      cookies: {},
    };
    res = {
      json: jest.fn(),
      status: jest.fn(() => res),
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  // Tests for register method
  describe('register', () => {
    beforeEach(() => {
      req.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        businessName: 'Test Business',
      };
    });

    it('should register a new owner successfully', async () => {
      expressValidator.validationResult.mockImplementation(() => ({ isEmpty: () => true, array: () => [] }));
      AuthModel.findUserByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed_password');
      AuthModel.createUser.mockResolvedValue({ id: 1, name: 'Test User', email: 'test@example.com', role: 'owner' });
      AuthModel.createBusiness.mockResolvedValue({ id: 1, name: 'Test Business' });
      AuthModel.updateUserBusinessId.mockResolvedValue({});
      jwt.default.sign.mockReturnValue('test_token');

      await authController.register(req, res);

      expect(res.cookie).toHaveBeenCalledWith('token', 'test_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Owner registered successfully',
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          role: 'owner',
          businessId: 1,
        },
      });
    });

    it('should return 400 on validation failure', async () => {
      expressValidator.validationResult.mockImplementation(() => ({ isEmpty: () => false, array: () => ['validation error'] }));

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Validation failed',
        errors: ['validation error'],
      });
    });

    it('should return 409 if user already exists', async () => {
      expressValidator.validationResult.mockImplementation(() => ({ isEmpty: () => true, array: () => [] }));
      AuthModel.findUserByEmail.mockResolvedValue({ id: 1, email: 'test@example.com' });

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User already exists with this email',
      });
    });

    it('should return 500 on server error', async () => {
      expressValidator.validationResult.mockImplementation(() => ({ isEmpty: () => true, array: () => [] }));
      AuthModel.findUserByEmail.mockRejectedValue(new Error('DB error'));

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error during registration',
      });
    });
  });

  // Tests for login method
  describe('login', () => {
    beforeEach(() => {
      req.body = {
        email: 'test@example.com',
        password: 'password123',
      };
    });

    it('should login user successfully', async () => {
      const user = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        role: 'owner',
        business_id: 1,
      };
      expressValidator.validationResult.mockImplementation(() => ({ isEmpty: () => true, array: () => [] }));
      AuthModel.findUserByEmail.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);
      jwt.default.sign.mockReturnValue('test_token');

      await authController.login(req, res);

      expect(res.cookie).toHaveBeenCalledWith('token', 'test_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Login successful',
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          role: 'owner',
          businessId: 1,
        },
      });
    });

    it('should return 400 on validation failure', async () => {
        expressValidator.validationResult.mockImplementation(() => ({ isEmpty: () => false, array: () => ['validation error'] }));
  
        await authController.login(req, res);
  
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          message: 'Validation failed',
          errors: ['validation error'],
        });
      });

    it('should return 401 for non-existent user', async () => {
      expressValidator.validationResult.mockImplementation(() => ({ isEmpty: () => true, array: () => [] }));
      AuthModel.findUserByEmail.mockResolvedValue(null);

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    it('should return 401 for invalid password', async () => {
      const user = {
        id: 1,
        password_hash: 'hashed_password'
      };
      expressValidator.validationResult.mockImplementation(() => ({ isEmpty: () => true, array: () => [] }));
      AuthModel.findUserByEmail.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(false);

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    it('should return 500 on server error', async () => {
        expressValidator.validationResult.mockImplementation(() => ({ isEmpty: () => true, array: () => [] }));
        AuthModel.findUserByEmail.mockRejectedValue(new Error('DB error'));
  
        await authController.login(req, res);
  
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          message: 'Internal server error during login',
        });
      });
  });

  // Tests for getProfile method
  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      const user = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'owner',
        business_id: 1,
      };
      req.userId = 1;
      AuthModel.findUserById.mockResolvedValue(user);

      await authController.getProfile(req, res);

      expect(res.json).toHaveBeenCalledWith({
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          role: 'owner',
          businessId: 1,
        },
      });
    });

    it('should return 404 if user not found', async () => {
      req.userId = 1;
      AuthModel.findUserById.mockResolvedValue(null);

      await authController.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 500 on server error', async () => {
        req.userId = 1;
        AuthModel.findUserById.mockRejectedValue(new Error('DB error'));
  
        await authController.getProfile(req, res);
  
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          message: 'Internal server error',
        });
      });
  });

  // Tests for logout method
  describe('logout', () => {
    beforeEach(() => {
      req.cookies = { token: 'test_token' };
    });

    it('should blacklist the token and return a success message', async () => {
      jwt.default.decode.mockReturnValue({ exp: Date.now() / 1000 + 3600 }); // Token expires in 1 hour
      AuthModel.blacklistToken.mockResolvedValue({});

      await authController.logout(req, res);

      expect(AuthModel.blacklistToken).toHaveBeenCalledWith(
        'test_token',
        expect.any(Date)
      );
      expect(res.clearCookie).toHaveBeenCalledWith('token');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Logout successful',
        logout: true,
      });
    });

    it('should return 500 on server error', async () => {
      jwt.default.decode.mockImplementation(() => { throw new Error('Decode error'); });

      await authController.logout(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Logout failed',
      });
    });
  });
});
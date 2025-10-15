import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('../../src/config/db.js', () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    verify: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/models/auth.js', () => ({
  AuthModel: {
    isTokenBlacklisted: jest.fn(),
  },
}));

// Dynamically import the module under test after mocks are set up
let authMiddleware;
let jwt;
let pool;
let AuthModel;

describe('Auth Middleware - authenticate', () => {
  let mockReq, mockRes, mockNext;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test_secret';
    authMiddleware = await import('../../src/middleware/auth.js');
    const jwtModule = await import('jsonwebtoken');
    jwt = jwtModule.default;
    const dbModule = await import('../../src/config/db.js');
    pool = dbModule.pool;
    const authModelModule = await import('../../src/models/auth.js');
    AuthModel = authModelModule.AuthModel;
  });

  beforeEach(() => {
    mockReq = { cookies: {}, user: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should return 401 if no token is provided', async () => {
    await authMiddleware.authenticate(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'No token provided' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid', async () => {
    mockReq.cookies.token = 'invalidtoken';
    AuthModel.isTokenBlacklisted.mockResolvedValue(false);
    jwt.verify.mockImplementation(() => {
      const error = new Error('invalid');
      error.name = 'JsonWebTokenError';
      throw error;
    });
    await authMiddleware.authenticate(mockReq, mockRes, mockNext);
    expect(jwt.verify).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid token' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if token is expired', async () => {
    mockReq.cookies.token = 'expiredtoken';
    AuthModel.isTokenBlacklisted.mockResolvedValue(false);
    jwt.verify.mockImplementation(() => {
      const error = new Error('expired');
      error.name = 'TokenExpiredError';
      throw error;
    });
    await authMiddleware.authenticate(mockReq, mockRes, mockNext);
    expect(jwt.verify).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token expired' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next and set req.user if token is valid', async () => {
    const mockPayload = { userId: 1, businessId: 101, role: 'owner' };
    mockReq.cookies.token = 'validtoken';
    AuthModel.isTokenBlacklisted.mockResolvedValue(false);
    jwt.verify.mockReturnValue(mockPayload);

    await authMiddleware.authenticate(mockReq, mockRes, mockNext);

    expect(jwt.verify).toHaveBeenCalledWith('validtoken', process.env.JWT_SECRET);
    expect(mockReq.user).toEqual({ id: 1, businessId: 101, role: 'owner' });
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});

describe('Auth Middleware - ownerOnly', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = { user: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should return 401 if req.user is not set', () => {
    mockReq.user = undefined;
    authMiddleware.ownerOnly(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Authentication required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 403 if user role is not owner', () => {
    mockReq.user = { role: 'staff' };
    authMiddleware.ownerOnly(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Owner access required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 403 if user is owner but no businessId', () => {
    mockReq.user = { role: 'owner', businessId: undefined };
    authMiddleware.ownerOnly(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Business context required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next if user is owner with businessId', () => {
    mockReq.user = { role: 'owner', businessId: 101 };
    authMiddleware.ownerOnly(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});

describe('Auth Middleware - staffOnly', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = { user: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should return 401 if req.user is not set', () => {
    mockReq.user = undefined;
    authMiddleware.staffOnly(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Authentication required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 403 if user role is not staff', () => {
    mockReq.user = { role: 'owner' };
    authMiddleware.staffOnly(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Staff access required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next if user role is staff', () => {
    mockReq.user = { role: 'staff' };
    authMiddleware.staffOnly(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});

describe('Auth Middleware - sameBusiness', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = { user: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should return 401 if req.user is not set', () => {
    mockReq.user = undefined;
    authMiddleware.sameBusiness(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Authentication required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 403 if no businessId is set', () => {
    mockReq.user = { id: 1 };
    authMiddleware.sameBusiness(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Business context required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next if req.user and businessId are set', () => {
    mockReq.user = { id: 1, businessId: 101 };
    authMiddleware.sameBusiness(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});

describe('Auth Middleware - ensureTaskBelongsToBusiness', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = { user: { businessId: 101 }, params: {}, body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should return 400 if task ID is not provided', async () => {
    mockReq.params = {};
    mockReq.body = {};
    await authMiddleware.ensureTaskBelongsToBusiness(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Task ID required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 404 if task is not found', async () => {
    mockReq.params = { id: 999 };
    pool.query.mockResolvedValue({ rows: [] });

    await authMiddleware.ensureTaskBelongsToBusiness(mockReq, mockRes, mockNext);

    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [999]);
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Task not found' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 403 if task belongs to a different business', async () => {
    mockReq.params = { id: 1 };
    pool.query.mockResolvedValue({ rows: [{ id: 1, business_id: 102 }] });

    await authMiddleware.ensureTaskBelongsToBusiness(mockReq, mockRes, mockNext);

    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1]);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied: task does not belong to your business' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next and set req.task if task belongs to the users business', async () => {
    const mockTask = { id: 1, business_id: 101 };
    mockReq.params = { id: 1 };
    pool.query.mockResolvedValue({ rows: [mockTask] });

    await authMiddleware.ensureTaskBelongsToBusiness(mockReq, mockRes, mockNext);

    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1]);
    expect(mockReq.task).toEqual(mockTask);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should return 500 on database error', async () => {
    mockReq.params = { id: 1 };
    pool.query.mockRejectedValue(new Error('DB Error'));

    await authMiddleware.ensureTaskBelongsToBusiness(mockReq, mockRes, mockNext);

    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1]);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    expect(mockNext).not.toHaveBeenCalled();
  });
});

describe('Auth Middleware - ownerOnly', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = { user: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should return 401 if req.user is not set', () => {
    mockReq.user = undefined;
    authMiddleware.ownerOnly(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Authentication required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 403 if user role is not owner', () => {
    mockReq.user = { role: 'staff' };
    authMiddleware.ownerOnly(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Owner access required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 403 if user is owner but no businessId', () => {
    mockReq.user = { role: 'owner', businessId: undefined };
    authMiddleware.ownerOnly(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Business context required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next if user is owner with businessId', () => {
    mockReq.user = { role: 'owner', businessId: 101 };
    authMiddleware.ownerOnly(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});

describe('Auth Middleware - ensureUserBelongsToBusiness', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = { user: { businessId: 101 }, params: {}, body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
    pool.query.mockClear();
  });

  it('should return 400 if user ID is not provided', async () => {
    mockReq.params = {};
    mockReq.body = {};
    await authMiddleware.ensureUserBelongsToBusiness(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'User ID required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 404 if user is not found', async () => {
    mockReq.params = { userId: 999 };
    pool.query.mockResolvedValue({ rows: [] });

    await authMiddleware.ensureUserBelongsToBusiness(mockReq, mockRes, mockNext);

    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [999, 101]);
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found or does not belong to your business' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next and set req.targetUser if user belongs to the same business', async () => {
    const mockUser = { id: 1, business_id: 101 };
    mockReq.params = { userId: 1 };
    pool.query.mockResolvedValue({ rows: [mockUser] });

    await authMiddleware.ensureUserBelongsToBusiness(mockReq, mockRes, mockNext);

    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1, 101]);
    expect(mockReq.targetUser).toEqual(mockUser);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should return 500 on database error', async () => {
    mockReq.params = { userId: 1 };
    pool.query.mockRejectedValue(new Error('DB Error'));

    await authMiddleware.ensureUserBelongsToBusiness(mockReq, mockRes, mockNext);

    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1, 101]);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    expect(mockNext).not.toHaveBeenCalled();
  });
});

describe('Auth Middleware - validateBusinessContext', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = { user: { id: 1, businessId: 101 }, params: {}, body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should return 400 if business ID is not provided', async () => {
    mockReq.user.businessId = undefined;
    await authMiddleware.validateBusinessContext(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Business context required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 403 if business is not found or user does not belong to it', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await authMiddleware.validateBusinessContext(mockReq, mockRes, mockNext);

    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1, 101]);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid business context or access revoked' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next and set req.business if validation is successful', async () => {
    const mockBusiness = { id: 101, name: 'Test Business', role: 'owner' };
    pool.query.mockResolvedValue({ rows: [mockBusiness] });

    await authMiddleware.validateBusinessContext(mockReq, mockRes, mockNext);

    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1, 101]);
    expect(mockReq.business).toEqual(mockBusiness);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should return 500 on database error', async () => {
    pool.query.mockRejectedValue(new Error('DB Error'));

    await authMiddleware.validateBusinessContext(mockReq, mockRes, mockNext);

    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1, 101]);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    expect(mockNext).not.toHaveBeenCalled();
  });
});
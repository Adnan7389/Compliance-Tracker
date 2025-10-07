import { jest } from '@jest/globals';

// Mock the pool module
jest.unstable_mockModule('../../src/config/db.js', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('AuthModel', () => {
  let AuthModel;
  let pool;

  beforeAll(async () => {
    const modelModule = await import('../../src/models/auth.js');
    AuthModel = modelModule.AuthModel;
    const dbModule = await import('../../src/config/db.js');
    pool = dbModule.pool;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user in the database', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        role: 'owner',
      };
      const mockResult = {
        rows: [{
          id: 1,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          business_id: null
        }],
      };
      pool.query.mockResolvedValue(mockResult);

      const newUser = await AuthModel.createUser(userData);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringMatching(/INSERT\s+INTO\s+users/),
        [userData.name, userData.email, userData.password_hash, userData.role]
      );
      expect(newUser).toEqual(mockResult.rows[0]);
    });
  });

  describe('createBusiness', () => {
    it('should create a new business in the database', async () => {
      const businessData = {
        name: 'Test Business',
        owner_id: 1,
      };
      const mockResult = {
        rows: [{
          id: 1,
          name: businessData.name,
          owner_id: businessData.owner_id
        }],
      };
      pool.query.mockResolvedValue(mockResult);

      const newBusiness = await AuthModel.createBusiness(businessData);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringMatching(/INSERT\s+INTO\s+businesses/),
        [businessData.name, businessData.owner_id]
      );
      expect(newBusiness).toEqual(mockResult.rows[0]);
    });
  });

  describe('updateUserBusinessId', () => {
    it('should update a users business_id', async () => {
      const userId = 1;
      const businessId = 1;
      const mockResult = {
        rows: [{
          id: userId,
          business_id: businessId
        }],
      };
      pool.query.mockResolvedValue(mockResult);

      const updatedUser = await AuthModel.updateUserBusinessId(userId, businessId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE\s+users\s+SET\s+business_id/),
        [businessId, userId]
      );
      expect(updatedUser).toEqual(mockResult.rows[0]);
    });
  });

  describe('findUserByEmail', () => {
    it('should find a user by email', async () => {
      const email = 'test@example.com';
      const mockResult = {
        rows: [{
          id: 1,
          name: 'Test User',
          email: email,
          password_hash: 'hashed_password',
          role: 'owner',
          business_id: 1
        }],
      };
      pool.query.mockResolvedValue(mockResult);

      const user = await AuthModel.findUserByEmail(email);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringMatching(/FROM\s+users\s+WHERE\s+email\s+=\s+\$1/),
        [email]
      );
      expect(user).toEqual(mockResult.rows[0]);
    });

    it('should return undefined if user not found by email', async () => {
      const email = 'nonexistent@example.com';
      const mockResult = {
        rows: []
      };
      pool.query.mockResolvedValue(mockResult);

      const user = await AuthModel.findUserByEmail(email);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringMatching(/FROM\s+users\s+WHERE\s+email\s+=\s+\$1/),
        [email]
      );
      expect(user).toBeUndefined();
    });
  });

  describe('findUserById', () => {
    it('should find a user by ID', async () => {
      const userId = 1;
      const mockResult = {
        rows: [{
          id: userId,
          name: 'Test User',
          email: 'test@example.com',
          role: 'owner',
          business_id: 1
        }],
      };
      pool.query.mockResolvedValue(mockResult);

      const user = await AuthModel.findUserById(userId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringMatching(/FROM\s+users\s+WHERE\s+id\s+=\s+\$1/),
        [userId]
      );
      expect(user).toEqual(mockResult.rows[0]);
    });

    it('should return undefined if user not found by ID', async () => {
      const userId = 999;
      const mockResult = {
        rows: []
      };
      pool.query.mockResolvedValue(mockResult);

      const user = await AuthModel.findUserById(userId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringMatching(/FROM\s+users\s+WHERE\s+id\s+=\s+\$1/),
        [userId]
      );
      expect(user).toBeUndefined();
    });
  });
});

import { jest } from '@jest/globals';

// Create mock functions
const mockQuery = jest.fn();

// Mock the entire db module BEFORE importing the model
jest.unstable_mockModule('../../src/config/db.js', () => ({
  __esModule: true,
  pool: {
    query: mockQuery,
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn()
  },
  query: mockQuery
}));

describe('StaffModel', () => {
  let StaffModel;

  beforeAll(async () => {
    const module = await import('../../src/models/staffModel.js');
    StaffModel = module.StaffModel;
  });

  beforeEach(() => {
    mockQuery.mockClear();
  });

  describe('checkEmailExists', () => {
    it('should return user if email exists', async () => {
      const mockUser = { id: 1, email: 'test@test.com' };
      mockQuery.mockResolvedValue({ rows: [mockUser] });

      const result = await StaffModel.checkEmailExists('test@test.com');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE email = $1', 
        ['test@test.com']
      );
      expect(result).toEqual(mockUser);
    });

    it('should return undefined if email does not exist', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await StaffModel.checkEmailExists('nonexistent@test.com');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE email = $1', 
        ['nonexistent@test.com']
      );
      expect(result).toBeUndefined();
    });
  });

  describe('createStaff', () => {
    it('should create staff and return user data without password', async () => {
      const mockStaff = {
        id: 2,
        name: 'John Doe',
        email: 'john@test.com',
        role: 'staff',
        business_id: 1,
        created_at: '2024-01-15T10:30:00.000Z'
      };
      
      mockQuery.mockResolvedValue({ rows: [mockStaff] });

      const staffData = {
        name: 'John Doe',
        email: 'john@test.com',
        password_hash: 'hashed_password',
        business_id: 1
      };

      const result = await StaffModel.createStaff(staffData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['John Doe', 'john@test.com', 'hashed_password', 'staff', 1]
      );
      expect(result).toEqual(mockStaff);
    });
  });
});
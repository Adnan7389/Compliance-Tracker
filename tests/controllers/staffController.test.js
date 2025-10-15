import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('../../src/models/staffModel.js', () => ({
  StaffModel: {
    checkEmailExists: jest.fn(),
    createStaff: jest.fn(),
    getStaffByBusiness: jest.fn()
  }
}));
jest.unstable_mockModule('bcrypt', () => ({
  hash: jest.fn()
}));

describe('StaffController', () => {
  let staffController;
  let StaffModel;
  let bcrypt;
  let mockReq, mockRes, mockNext;

  beforeAll(async () => {
    const controllerModule = await import('../../src/controllers/staffController.js');
    staffController = controllerModule.staffController;
    const modelModule = await import('../../src/models/staffModel.js');
    StaffModel = modelModule.StaffModel;
    bcrypt = await import('bcrypt');
  });

  beforeEach(() => {
    mockReq = {
      body: {},
      user: { businessId: 1 }
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    mockNext = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('createStaff', () => {
    it('should create staff successfully', async () => {
      mockReq.body = {
        name: 'Jane Doe',
        email: 'jane@test.com',
        password: 'Password123'
      };

      StaffModel.checkEmailExists.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed_password');
      
      const mockStaff = {
        id: 3,
        name: 'Jane Doe',
        email: 'jane@test.com',
        role: 'staff',
        business_id: 1,
        created_at: '2024-01-15T10:30:00.000Z'
      };
      
      StaffModel.createStaff.mockResolvedValue(mockStaff);

      await staffController.createStaff(mockReq, mockRes);

      expect(StaffModel.checkEmailExists).toHaveBeenCalledWith('jane@test.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123', 10);
      expect(StaffModel.createStaff).toHaveBeenCalledWith({
        name: 'Jane Doe',
        email: 'jane@test.com',
        password_hash: 'hashed_password',
        business_id: 1
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Staff member created successfully',
        staff: mockStaff
      });
    });

    it('should return 409 if email already exists', async () => {
      mockReq.body = {
        name: 'Jane Doe',
        email: 'existing@test.com',
        password: 'Password123'
      };

      StaffModel.checkEmailExists.mockResolvedValue({ id: 1, email: 'existing@test.com' });

      await staffController.createStaff(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Email already registered'
      });
    });
  });

  describe('getStaff', () => {
    it('should return all staff for business', async () => {
      const mockStaffList = [
        { id: 1, name: 'Staff 1', email: 'staff1@test.com', role: 'staff' },
        { id: 2, name: 'Staff 2', email: 'staff2@test.com', role: 'staff' }
      ];

      StaffModel.getStaffByBusiness.mockResolvedValue(mockStaffList);

      await staffController.getStaff(mockReq, mockRes);

      expect(StaffModel.getStaffByBusiness).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Staff retrieved successfully',
        staff: mockStaffList,
        count: 2
      });
    });
  });
});
import bcrypt from 'bcrypt';
import { StaffModel } from '../models/staffModel.js';

export const staffController = {
  // Create new staff member
  async createStaff(req, res) {
    try {
      const { name, email, password } = req.body;
      const businessId = req.user.businessId;

      // Check if email already exists
      const existingUser = await StaffModel.checkEmailExists(email);
      if (existingUser) {
        return res.status(409).json({
          message: 'Email already registered'
        });
      }

      // Hash password
      const password_hash = await bcrypt.hash(
        password, 
        parseInt(process.env.BCRYPT_ROUNDS) || 10
      );

      // Create staff user
      const staff = await StaffModel.createStaff({
        name,
        email,
        password_hash,
        business_id: businessId
      });

      // Remove password_hash from response
      const { password_hash: _, ...staffResponse } = staff;

      res.status(201).json({
        message: 'Staff member created successfully',
        staff: staffResponse
      });

    } catch (error) {
      console.error('Create staff error:', error);
      
      // Handle duplicate email race condition
      if (error.code === '23505') {
        return res.status(409).json({
          message: 'Email already registered'
        });
      }

      res.status(500).json({
        message: 'Failed to create staff member'
      });
    }
  },

  // Get all staff for business
  async getStaff(req, res) {
    try {
      const businessId = req.user.businessId;
      const staff = await StaffModel.getStaffByBusiness(businessId);

      res.json({
        message: 'Staff retrieved successfully',
        staff,
        count: staff.length
      });

    } catch (error) {
      console.error('Get staff error:', error);
      res.status(500).json({
        message: 'Failed to retrieve staff members'
      });
    }
  },

  // Get specific staff member
  async getStaffMember(req, res) {
    try {
      const { staffId } = req.params;
      const businessId = req.user.businessId;

      const staff = await StaffModel.getStaffById(staffId, businessId);
      
      if (!staff) {
        return res.status(404).json({
          message: 'Staff member not found'
        });
      }

      res.json({
        message: 'Staff member retrieved successfully',
        staff
      });

    } catch (error) {
      console.error('Get staff member error:', error);
      res.status(500).json({
        message: 'Failed to retrieve staff member'
      });
    }
  }
};
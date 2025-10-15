import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { AuthModel } from '../models/auth.js';

export const authController = {
  // Register a new owner
  async register(req, res) {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { name, email, password, businessName } = req.body;

      // Check if user already exists
      const existingUser = await AuthModel.findUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ 
          message: 'User already exists with this email' 
        });
      }

      // Hash password
      const password_hash = await bcrypt.hash(
        password, 
        parseInt(process.env.BCRYPT_ROUNDS) || 10
      );

      // Start transaction (we'll handle this with async/await since we're using pg)
      // 1) Create user
      const user = await AuthModel.createUser({
        name,
        email,
        password_hash,
        role: 'owner'
      });

      // 2) Create business
      const business = await AuthModel.createBusiness({
        name: businessName,
        owner_id: user.id
      });

      // 3) Update user with business_id
      await AuthModel.updateUserBusinessId(user.id, business.id);

      // 4) Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          businessId: business.id, 
          role: 'owner' 
        }, 
        process.env.JWT_SECRET, 
        { 
          expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
        }
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: 'strict', // Prevent CSRF attacks
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(201).json({
        message: 'Owner registered successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          businessId: business.id
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        message: 'Internal server error during registration' 
      });
    }
  },

  // Login user
  async login(req, res) {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { email, password } = req.body;

      // Find user by email
      const user = await AuthModel.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ 
          message: 'Invalid credentials' 
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ 
          message: 'Invalid credentials' 
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          businessId: user.business_id, 
          role: user.role 
        }, 
        process.env.JWT_SECRET, 
        { 
          expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
        }
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: 'strict', // Prevent CSRF attacks
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          businessId: user.business_id
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        message: 'Internal server error during login' 
      });
    }
  },

  // Get current user profile
  async getProfile(req, res) {
    try {
      const user = await AuthModel.findUserById(req.userId);
      if (!user) {
        return res.status(404).json({ 
          message: 'User not found' 
        });
      }

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          businessId: user.business_id
        }
      });

    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ 
        message: 'Internal server error' 
      });
    }
  },

  async logout(req, res) {
    try {
      const { token } = req.cookies;
      
      if (token) {
        // Decode token to get expiration
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
          // Add to blacklist until token expires
          const expiresAt = new Date(decoded.exp * 1000);
          await AuthModel.blacklistToken(token, expiresAt);
        }
      }
      
      res.clearCookie('token');
      res.json({
        message: 'Logout successful',
        logout: true
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        message: 'Logout failed'
      });
    }
  }
};
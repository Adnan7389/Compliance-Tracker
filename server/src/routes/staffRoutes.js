import express from 'express';
import { staffController } from '../controllers/staffController.js';
import { authenticate, ownerOnly, ensureUserBelongsToBusiness } from '../middleware/auth.js';
import { validateStaffCreation, validateStaffId, handleValidationErrors } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// All routes require authentication and owner role
router.use(authenticate, ownerOnly);

// Create staff member
router.post(
  '/',
  validateStaffCreation,
  handleValidationErrors,
  asyncHandler(staffController.createStaff)
);

// Get all staff for business
router.get(
  '/',
  asyncHandler(staffController.getStaff)
);

// Get specific staff member
router.get(
  '/:staffId',
  validateStaffId,
  handleValidationErrors,
  ensureUserBelongsToBusiness, // This ensures the staff member belongs to owner's business
  asyncHandler(staffController.getStaffMember)
);

export default router;
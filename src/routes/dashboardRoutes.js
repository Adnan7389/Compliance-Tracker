import express from 'express';
import { dashboardController } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/dashboard - Complete dashboard data
router.get(
  '/dashboard',
  asyncHandler(dashboardController.getDashboard)
);

// GET /api/dashboard/stats - Only statistics (lightweight)
router.get(
  '/dashboard/stats',
  asyncHandler(dashboardController.getStats)
);

export default router;
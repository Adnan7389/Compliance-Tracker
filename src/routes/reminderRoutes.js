import express from 'express';
import reminderController from '../controllers/reminderController.js';
import { authenticate, ownerOnly } from '../middleware/auth.js';

const router = express.Router();

// @desc    Trigger reminder jobs manually
// @route   POST /api/reminders/trigger
// @access  Private/Admin
router.post(
  '/trigger',
  authenticate,
  ownerOnly,
  reminderController.triggerReminders
);

// @desc    Test SMTP email connection
// @route   GET /api/reminders/test-email
// @access  Private/Admin
router.get(
  '/test-email',
  authenticate,
  ownerOnly,
  reminderController.testEmailConnection
);

export default router;

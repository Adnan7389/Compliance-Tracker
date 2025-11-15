import express from 'express';
import { testController } from '../controllers/testController.js';
import { authenticate, ownerOnly } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Development-only routes for testing
if (process.env.NODE_ENV !== 'production') {
  // POST /api/test/reminders - Trigger reminders manually
  router.post(
    '/test/reminders',
    authenticate,
    ownerOnly, // Only owners can trigger manually
    asyncHandler(testController.triggerReminders)
  );

  // POST /api/test/email - Send test email
  router.post(
    '/test/email',
    authenticate,
    ownerOnly,
    asyncHandler(testController.testEmail)
  );
}

// Production-safe test routes
// POST /api/test/prod-email-test - Send test email to owner
router.post(
  '/test/prod-email-test',
  authenticate,
  ownerOnly,
  asyncHandler(testController.testProductionEmail)
);

export default router;
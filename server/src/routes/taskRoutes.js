import express from 'express';
import { taskController } from '../controllers/taskController.js';
import { 
  authenticate, 
  ownerOnly, 
  ensureTaskBelongsToBusiness 
} from '../middleware/auth.js';
import { 
  validateTaskCreation, 
  validateTaskUpdate, 
  validateTaskId, 
  validateTaskQuery,
  handleValidationErrors 
} from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/tasks - Owner and staff (role-based in controller)
router.get(
  '/',
  validateTaskQuery,
  handleValidationErrors,
  asyncHandler(taskController.getTasks)
);

// GET /api/tasks/:id - Owner and staff (with ownership check)
router.get(
  '/:id',
  validateTaskId,
  handleValidationErrors,
  asyncHandler(taskController.getTask)
);

// POST /api/tasks - Owner only
router.post(
  '/',
  ownerOnly,
  validateTaskCreation,
  handleValidationErrors,
  asyncHandler(taskController.createTask)
);

// PUT /api/tasks/:id - Owner and staff (role-based updates)
router.put(
  '/:id',
  validateTaskId,
  validateTaskUpdate,
  handleValidationErrors,
  ensureTaskBelongsToBusiness, // This adds req.task for additional validation
  asyncHandler(taskController.updateTask)
);

// DELETE /api/tasks/:id - Owner only
router.delete(
  '/:id',
  ownerOnly,
  validateTaskId,
  handleValidationErrors,
  asyncHandler(taskController.deleteTask)
);

export default router;
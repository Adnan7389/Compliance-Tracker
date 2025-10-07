import express from 'express';
import { documentController } from '../controllers/documentController.js';
import { 
  authenticate, 
  ensureTaskBelongsToBusiness 
} from '../middleware/auth.js';
import { upload, uploadMultiple } from '../middleware/upload.js';
import { validateDocumentId, handleValidationErrors } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Upload document to task
router.post(
  '/tasks/:id/documents',
  ensureTaskBelongsToBusiness,
  upload.single('file'),
  asyncHandler(documentController.uploadDocument)
);

// Upload multiple documents
router.post(
  '/tasks/:id/documents/multiple',
  ensureTaskBelongsToBusiness,
  (req, res, next) => {
    uploadMultiple(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          message: err.message
        });
      }
      next();
    });
  },
  asyncHandler(documentController.uploadDocument)
);

// Get task documents
router.get(
  '/tasks/:id/documents',
  ensureTaskBelongsToBusiness,
  asyncHandler(documentController.getTaskDocuments)
);

// Download document
router.get(
  '/documents/:id/download',
  validateDocumentId,
  handleValidationErrors,
  asyncHandler(documentController.downloadDocument)
);

// Delete document
router.delete(
  '/documents/:id',
  validateDocumentId,
  handleValidationErrors,
  asyncHandler(documentController.deleteDocument)
);

export default router;
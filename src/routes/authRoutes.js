import express from 'express';
import { authController } from '../controllers/authController.js';
import { validateRegistration, validateLogin, handleValidationErrors } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', validateRegistration, handleValidationErrors, authController.register);
router.post('/login', validateLogin, handleValidationErrors, authController.login);
router.get('/profile', authenticate, authController.getProfile);

export default router;
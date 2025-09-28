import express from 'express';
import { authController } from '../controllers/authController.js';
import { validateRegistration, validateLogin } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);
router.get('/profile', authenticate, authController.getProfile);

export default router;
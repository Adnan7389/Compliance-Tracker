import express from 'express';
import { authController } from '../controllers/auth.js';
import { validateRegistration, validateLogin } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);
router.get('/profile', authenticateToken, authController.getProfile);

export default router;
import { Router, type Router as ExpressRouter } from 'express';
import {
  forgotPasswordController,
  googleLoginController,
  loginController,
  logoutController,
  meController,
  pricingController,
  registerController,
  resetPasswordController,
} from '../controllers/authController.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { createGenerateRateLimiter } from '../middleware/rateLimit.js';

const authRoutes: ExpressRouter = Router();
const authLimiter = createGenerateRateLimiter();

authRoutes.post('/register', authLimiter, registerController);
authRoutes.post('/login', authLimiter, loginController);
authRoutes.post('/google', authLimiter, googleLoginController);
authRoutes.post('/logout', optionalAuth, logoutController);
authRoutes.post('/forgot-password', authLimiter, forgotPasswordController);
authRoutes.post('/reset-password', authLimiter, resetPasswordController);
authRoutes.get('/me', requireAuth, meController);
authRoutes.get('/pricing', pricingController);

export { authRoutes };

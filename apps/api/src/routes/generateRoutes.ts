import { Router, type Router as ExpressRouter } from 'express';
import {
  generateApiCodeController,
  generateTypeScriptController,
} from '../controllers/generateController.js';
import { createGenerateRateLimiter } from '../middleware/rateLimit.js';
import { optionalAuth } from '../middleware/auth.js';

const generateRoutes: ExpressRouter = Router();
const rateLimiter = createGenerateRateLimiter();

generateRoutes.post('/typescript', optionalAuth, rateLimiter, generateTypeScriptController);
generateRoutes.post('/api-code', optionalAuth, rateLimiter, generateApiCodeController);

export { generateRoutes };

import { Router, type Router as ExpressRouter } from 'express';
import { generateTypeScriptController } from '../controllers/generateController.js';
import { createGenerateRateLimiter } from '../middleware/rateLimit.js';

const generateRoutes: ExpressRouter = Router();
const rateLimiter = createGenerateRateLimiter();

generateRoutes.post('/typescript', rateLimiter, generateTypeScriptController);

export { generateRoutes };

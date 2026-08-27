import { Router, type Router as ExpressRouter } from 'express';
import {
  generateOpenApiController,
  importOpenApiUrlController,
  parseOpenApiController,
} from '../controllers/openapiController.js';
import { createGenerateRateLimiter } from '../middleware/rateLimit.js';
import { optionalAuth } from '../middleware/auth.js';

const openapiRoutes: ExpressRouter = Router();
const rateLimiter = createGenerateRateLimiter();

openapiRoutes.post('/parse', rateLimiter, parseOpenApiController);
openapiRoutes.post('/import-url', rateLimiter, importOpenApiUrlController);
openapiRoutes.post('/generate', optionalAuth, rateLimiter, generateOpenApiController);

export { openapiRoutes };

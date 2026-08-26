import { Router, type Router as ExpressRouter } from 'express';
import {
  generateOpenApiController,
  importOpenApiUrlController,
  parseOpenApiController,
} from '../controllers/openapiController.js';
import { createGenerateRateLimiter } from '../middleware/rateLimit.js';

const openapiRoutes: ExpressRouter = Router();
const rateLimiter = createGenerateRateLimiter();

openapiRoutes.post('/parse', rateLimiter, parseOpenApiController);
openapiRoutes.post('/import-url', rateLimiter, importOpenApiUrlController);
openapiRoutes.post('/generate', rateLimiter, generateOpenApiController);

export { openapiRoutes };

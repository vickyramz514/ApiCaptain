import { Router, type Router as ExpressRouter } from 'express';
import { healthController } from '../controllers/healthController.js';
import { generateRoutes } from './generateRoutes.js';
import { openapiRoutes } from './openapiRoutes.js';

const apiRouter: ExpressRouter = Router();

apiRouter.get('/health', healthController);
apiRouter.use('/api/v1/generate', generateRoutes);
apiRouter.use('/api/v1/openapi', openapiRoutes);

export { apiRouter };

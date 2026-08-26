import { Router, type Router as ExpressRouter } from 'express';
import { healthController } from '../controllers/healthController.js';
import { generateRoutes } from './generateRoutes.js';

const apiRouter: ExpressRouter = Router();

apiRouter.get('/health', healthController);
apiRouter.use('/api/v1/generate', generateRoutes);

export { apiRouter };

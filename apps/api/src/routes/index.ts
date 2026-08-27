import { Router, type Router as ExpressRouter } from 'express';
import { healthController } from '../controllers/healthController.js';
import { deleteAccountController } from '../controllers/authController.js';
import { dashboardController } from '../controllers/projectController.js';
import { generateRoutes } from './generateRoutes.js';
import { openapiRoutes } from './openapiRoutes.js';
import { authRoutes } from './authRoutes.js';
import { projectRoutes } from './projectRoutes.js';
import { requireAuth } from '../middleware/auth.js';

const apiRouter: ExpressRouter = Router();

apiRouter.get('/health', healthController);
apiRouter.use('/api/v1/auth', authRoutes);
apiRouter.delete('/api/v1/account', requireAuth, deleteAccountController);
apiRouter.get('/api/v1/dashboard', requireAuth, dashboardController);
apiRouter.use('/api/v1/projects', projectRoutes);
apiRouter.use('/api/v1/generate', generateRoutes);
apiRouter.use('/api/v1/openapi', openapiRoutes);

export { apiRouter };

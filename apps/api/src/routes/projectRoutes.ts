import { Router, type Router as ExpressRouter } from 'express';
import {
  createProjectController,
  deleteProjectController,
  getProjectController,
  listProjectsController,
  projectGenerateController,
  projectHistoryController,
  updateProjectController,
} from '../controllers/projectController.js';
import { requireAuth } from '../middleware/auth.js';
import { createGenerateRateLimiter } from '../middleware/rateLimit.js';

const projectRoutes: ExpressRouter = Router();
const limiter = createGenerateRateLimiter();

projectRoutes.post('/', requireAuth, limiter, createProjectController);
projectRoutes.get('/', requireAuth, listProjectsController);
projectRoutes.get('/:id/history', requireAuth, projectHistoryController);
projectRoutes.post('/:id/generate', requireAuth, limiter, projectGenerateController);
projectRoutes.get('/:id', requireAuth, getProjectController);
projectRoutes.patch('/:id', requireAuth, updateProjectController);
projectRoutes.delete('/:id', requireAuth, deleteProjectController);

export { projectRoutes };

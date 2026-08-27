import { Router, type Router as ExpressRouter } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  billingPaymentsController,
  billingStatusController,
  cancelSubscriptionController,
  reactivateSubscriptionController,
  subscribeController,
  verifyPaymentController,
} from '../controllers/billingController.js';

const billingRoutes: ExpressRouter = Router();

billingRoutes.get('/', requireAuth, billingStatusController);
billingRoutes.get('/payments', requireAuth, billingPaymentsController);
billingRoutes.post('/subscribe', requireAuth, subscribeController);
billingRoutes.post('/verify', requireAuth, verifyPaymentController);
billingRoutes.post('/cancel', requireAuth, cancelSubscriptionController);
billingRoutes.post('/reactivate', requireAuth, reactivateSubscriptionController);

export { billingRoutes };

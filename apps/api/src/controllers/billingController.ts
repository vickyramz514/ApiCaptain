import type { NextFunction, Request, Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { validateCancelSubscription, validateVerifyPayment } from '../validators/billing.js';
import {
  cancelCurrentSubscription,
  createProCheckout,
  getBillingStatus,
  listBillingPayments,
  reactivateCurrentSubscription,
  verifyProPayment,
} from '../services/billingService.js';
import { processRazorpayWebhook } from '../services/webhookService.js';

export const billingStatusController = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('AUTH_REQUIRED', 'Authentication required', 401);
    sendSuccess(res, await getBillingStatus(req.user));
  } catch (error) {
    next(error);
  }
};

export const billingPaymentsController = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('AUTH_REQUIRED', 'Authentication required', 401);
    sendSuccess(res, await listBillingPayments(req.user));
  } catch (error) {
    next(error);
  }
};

export const subscribeController = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('AUTH_REQUIRED', 'Authentication required', 401);
    sendSuccess(res, await createProCheckout(req.user));
  } catch (error) {
    next(error);
  }
};

export const verifyPaymentController = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('AUTH_REQUIRED', 'Authentication required', 401);
    sendSuccess(res, await verifyProPayment(req.user, validateVerifyPayment(req.body)));
  } catch (error) {
    next(error);
  }
};

export const cancelSubscriptionController = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('AUTH_REQUIRED', 'Authentication required', 401);
    const { immediately } = validateCancelSubscription(req.body);
    sendSuccess(res, await cancelCurrentSubscription(req.user, immediately));
  } catch (error) {
    next(error);
  }
};

export const reactivateSubscriptionController = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('AUTH_REQUIRED', 'Authentication required', 401);
    sendSuccess(res, await reactivateCurrentSubscription(req.user));
  } catch (error) {
    next(error);
  }
};

export const razorpayWebhookController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const signature = req.header('x-razorpay-signature') ?? '';
    const raw = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === 'string' ? req.body : '');
    const result = await processRazorpayWebhook(raw, signature);
    sendSuccess(res, { received: true, duplicate: result.duplicate, eventType: result.eventType });
  } catch (error) {
    next(error);
  }
};

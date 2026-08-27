import type { CancelSubscriptionRequest, VerifyPaymentRequest } from '@apicaptain/types';
import { AppError } from '../utils/errors.js';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const validateVerifyPayment = (body: unknown): VerifyPaymentRequest => {
  if (!isObject(body)) throw new AppError('VALIDATION_ERROR', 'Invalid body');
  if (
    typeof body.razorpay_payment_id !== 'string' ||
    typeof body.razorpay_subscription_id !== 'string' ||
    typeof body.razorpay_signature !== 'string'
  ) {
    throw new AppError(
      'VALIDATION_ERROR',
      'razorpay_payment_id, razorpay_subscription_id, and razorpay_signature are required',
    );
  }
  return {
    razorpay_payment_id: body.razorpay_payment_id,
    razorpay_subscription_id: body.razorpay_subscription_id,
    razorpay_signature: body.razorpay_signature,
  };
};

export const validateCancelSubscription = (body: unknown): CancelSubscriptionRequest => {
  if (body === undefined || body === null) return { immediately: false };
  if (!isObject(body)) throw new AppError('VALIDATION_ERROR', 'Invalid body');
  return { immediately: body.immediately === true };
};

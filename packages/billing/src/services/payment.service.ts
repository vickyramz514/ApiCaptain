import { getPaymentProvider } from './billing.service.js';
import type { CheckoutVerificationInput, ProviderPayment, ProviderPaymentHistoryItem } from '../types/index.js';

export const verifyCheckoutPayment = (input: CheckoutVerificationInput): boolean =>
  getPaymentProvider().verifyPayment(input);

export const retrieveProviderPayment = (id: string): Promise<ProviderPayment> =>
  getPaymentProvider().getPayment(id);

export const retrieveProviderPaymentHistory = (
  subscriptionId: string,
): Promise<ProviderPaymentHistoryItem[]> => getPaymentProvider().getPaymentHistory(subscriptionId);

export const verifyProviderWebhook = (rawBody: Buffer | string, signature: string): boolean =>
  getPaymentProvider().verifyWebhook(rawBody, signature);

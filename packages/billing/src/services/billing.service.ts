import type { BillingConfig } from '@apicaptain/config';
import { getBillingConfig } from '@apicaptain/config';
import { getMockPaymentProvider } from '../providers/mock.js';
import { createRazorpayProvider } from '../providers/razorpay/index.js';
import type { PaymentProvider } from '../types/index.js';

let override: PaymentProvider | null = null;

export const setPaymentProviderForTests = (provider: PaymentProvider | null): void => {
  override = provider;
};

export const getPaymentProvider = (config = getBillingConfig()): PaymentProvider => {
  if (override) return override;
  if (config.billingProvider === 'mock') return getMockPaymentProvider(config);
  return createRazorpayProvider(config);
};

export const withBillingConfig = (config: BillingConfig): PaymentProvider => getPaymentProvider(config);

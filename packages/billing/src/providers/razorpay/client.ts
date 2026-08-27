import type { BillingConfig } from '@apicaptain/config';
import Razorpay from 'razorpay';
import { billingProviderError } from '../../errors.js';

export interface RazorpaySdkLike {
  customers: {
    create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
  subscriptions: {
    create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
    fetch: (id: string) => Promise<Record<string, unknown>>;
    cancel: (id: string, cancelAtCycleEnd?: boolean) => Promise<Record<string, unknown>>;
    resume: (id: string, data?: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
  payments: {
    fetch: (id: string) => Promise<Record<string, unknown>>;
  };
  invoices: {
    all: (options: Record<string, unknown>) => Promise<{ items?: Record<string, unknown>[] }>;
  };
}

export const assertRazorpayConfigured = (config: BillingConfig): void => {
  if (!config.razorpayKeyId || !config.razorpayKeySecret) {
    throw billingProviderError('Razorpay is not configured');
  }
};

export const createRazorpaySdk = (config: BillingConfig): RazorpaySdkLike => {
  assertRazorpayConfigured(config);
  return new Razorpay({
    key_id: config.razorpayKeyId,
    key_secret: config.razorpayKeySecret,
  }) as unknown as RazorpaySdkLike;
};

export const wrapProviderCall = async <T>(operation: string, run: () => Promise<T>): Promise<T> => {
  try {
    return await run();
  } catch {
    throw billingProviderError(`${operation} failed`);
  }
};

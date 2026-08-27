import {
  PRO_MONTHLY_AMOUNT_PAISE,
  RAZORPAY_SUBSCRIPTION_TOTAL_COUNT,
  type BillingConfig,
} from '@apicaptain/config';
import { billingProviderError } from '../../errors.js';
import type {
  CreateCustomerInput,
  CreateSubscriptionInput,
  ProviderCustomer,
  ProviderSubscription,
} from '../../types/index.js';
import type { RazorpaySdkLike } from './client.js';
import { wrapProviderCall } from './client.js';
import { asString, toProviderSubscription } from './map.js';

export const createRazorpayCustomer = async (
  client: RazorpaySdkLike,
  input: CreateCustomerInput,
): Promise<ProviderCustomer> => {
  const raw = await wrapProviderCall('createCustomer', () =>
    client.customers.create({
      email: input.email,
      name: input.name ?? undefined,
      fail_existing: 0,
      notes: input.notes,
    }),
  );
  const id = asString(raw.id);
  if (!id) throw billingProviderError('Razorpay customer create returned no id');
  return { id, email: asString(raw.email) ?? input.email, name: asString(raw.name) };
};

export const createRazorpaySubscription = async (
  client: RazorpaySdkLike,
  config: BillingConfig,
  input: CreateSubscriptionInput,
): Promise<ProviderSubscription> => {
  const planId = input.planId || config.razorpayProPlanId;
  if (!planId) throw billingProviderError('Razorpay Pro plan id is not configured');
  const raw = await wrapProviderCall('createSubscription', () =>
    client.subscriptions.create({
      plan_id: planId,
      customer_id: input.customerId,
      total_count: input.totalCount || RAZORPAY_SUBSCRIPTION_TOTAL_COUNT,
      quantity: 1,
      customer_notify: 1,
      notes: input.notes,
    }),
  );
  const mapped = toProviderSubscription(raw);
  if (!mapped.id) throw billingProviderError('Razorpay subscription create returned no id');
  return mapped;
};

export const fetchRazorpaySubscription = async (
  client: RazorpaySdkLike,
  id: string,
): Promise<ProviderSubscription> => {
  const raw = await wrapProviderCall('getSubscription', () => client.subscriptions.fetch(id));
  return toProviderSubscription(raw);
};

export const cancelRazorpaySubscription = async (
  client: RazorpaySdkLike,
  id: string,
  cancelAtPeriodEnd: boolean,
): Promise<ProviderSubscription> => {
  const raw = await wrapProviderCall('cancelSubscription', () =>
    client.subscriptions.cancel(id, cancelAtPeriodEnd),
  );
  return { ...toProviderSubscription(raw), cancelAtPeriodEnd };
};

export const resumeRazorpaySubscription = async (
  client: RazorpaySdkLike,
  id: string,
): Promise<ProviderSubscription> => {
  const raw = await wrapProviderCall('resumeSubscription', () =>
    client.subscriptions.resume(id, { resume_at: 'now' }),
  );
  return toProviderSubscription(raw);
};

export const expectedProAmountPaise = PRO_MONTHLY_AMOUNT_PAISE;

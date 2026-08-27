import {
  PRO_PLAN_NAME,
  RAZORPAY_SUBSCRIPTION_TOTAL_COUNT,
  getBillingConfig,
} from '@apicaptain/config';
import type {
  CreateCustomerInput,
  CreateSubscriptionInput,
  ProviderCustomer,
  ProviderSubscription,
} from '../types/index.js';
import { getPaymentProvider } from './billing.service.js';
import { mapProviderSubscription } from '../providers/index.js';

export const createCustomer = async (input: CreateCustomerInput): Promise<ProviderCustomer> =>
  getPaymentProvider().createCustomer(input);

export const createProviderSubscription = async (
  input: Omit<CreateSubscriptionInput, 'planId' | 'totalCount'> &
    Partial<Pick<CreateSubscriptionInput, 'planId' | 'totalCount'>>,
): Promise<ProviderSubscription> => {
  const config = getBillingConfig();
  return getPaymentProvider().createSubscription({
    customerId: input.customerId,
    planId: input.planId || config.razorpayProPlanId,
    totalCount: input.totalCount || RAZORPAY_SUBSCRIPTION_TOTAL_COUNT,
    notes: input.notes,
  });
};

export const retrieveProviderSubscription = async (id: string): Promise<ProviderSubscription> =>
  getPaymentProvider().getSubscription(id);

export const cancelProviderSubscription = async (
  id: string,
  cancelAtPeriodEnd = true,
): Promise<ProviderSubscription> => getPaymentProvider().cancelSubscription(id, cancelAtPeriodEnd);

export const resumeProviderSubscription = async (id: string): Promise<ProviderSubscription> =>
  getPaymentProvider().resumeSubscription(id);

export const syncMappedSubscription = async (id: string) =>
  mapProviderSubscription(await retrieveProviderSubscription(id));

export const checkoutProductName = PRO_PLAN_NAME;

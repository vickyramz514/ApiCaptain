import {
  getEffectivePlan,
  type SubscriptionStatusId,
  type UserPlanId,
} from '@apicaptain/config';
import type { MappedSubscriptionState, ProviderSubscription } from '../types/index.js';
import { mapRazorpaySubscriptionStatus } from './razorpay/map.js';

export const mapProviderSubscription = (
  subscription: ProviderSubscription,
  extras?: { cancelAtPeriodEnd?: boolean; cancelledAt?: Date | null },
): MappedSubscriptionState => {
  const status = mapRazorpaySubscriptionStatus(subscription.status);
  const cancelAtPeriodEnd = extras?.cancelAtPeriodEnd ?? subscription.cancelAtPeriodEnd;
  const cancelledAt =
    extras?.cancelledAt ??
    (status === 'CANCELLED' || status === 'EXPIRED' ? (subscription.endedAt ?? new Date()) : null);
  const currentPeriodEnd = subscription.currentPeriodEnd ?? subscription.endedAt;
  const plan: UserPlanId = getEffectivePlan({
    status,
    currentPeriodEnd,
    cancelAtPeriodEnd,
  });

  return {
    plan,
    status,
    provider: 'RAZORPAY',
    providerCustomerId: subscription.customerId,
    providerSubscriptionId: subscription.id,
    providerPlanId: subscription.planId,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    cancelledAt,
  };
};

export const shouldKeepProDuringCancel = (
  status: SubscriptionStatusId,
  currentPeriodEnd: Date | null,
  now = new Date(),
): boolean => {
  if (status !== 'CANCELLED') return false;
  return Boolean(currentPeriodEnd && currentPeriodEnd.getTime() > now.getTime());
};

export { mapRazorpayPaymentStatus, mapRazorpaySubscriptionStatus } from './razorpay/map.js';
export { RazorpayProvider, createRazorpayProvider } from './razorpay/index.js';
export { MockPaymentProvider, getMockPaymentProvider, resetMockPaymentProvider } from './mock.js';

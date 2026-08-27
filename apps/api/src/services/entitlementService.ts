import {
  getEffectivePlan,
  type SubscriptionStatusId,
  type UserPlanId,
} from '@apicaptain/config';
import { memoryStore, useMemoryStore, type StoreSubscription } from '../db/memoryStore.js';
import { prisma } from '../db/prisma.js';

export type LocalSubscription = {
  id: string;
  userId: string;
  plan: UserPlanId;
  status: SubscriptionStatusId;
  provider: 'NONE' | 'RAZORPAY' | 'STRIPE';
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  providerPlanId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: Date | null;
};

const fromStore = (item: StoreSubscription): LocalSubscription => item;

const fromPrisma = (item: {
  id: string;
  userId: string;
  plan: string;
  status: string;
  provider: string;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  providerPlanId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: Date | null;
}): LocalSubscription => ({
  id: item.id,
  userId: item.userId,
  plan: item.plan as UserPlanId,
  status: item.status as SubscriptionStatusId,
  provider: item.provider as LocalSubscription['provider'],
  providerCustomerId: item.providerCustomerId,
  providerSubscriptionId: item.providerSubscriptionId,
  providerPlanId: item.providerPlanId,
  currentPeriodStart: item.currentPeriodStart,
  currentPeriodEnd: item.currentPeriodEnd,
  cancelAtPeriodEnd: item.cancelAtPeriodEnd,
  cancelledAt: item.cancelledAt,
});

export const getLatestSubscription = async (userId: string): Promise<LocalSubscription | null> => {
  if (useMemoryStore()) {
    const found = memoryStore.getLatestSubscription(userId);
    return found ? fromStore(found) : null;
  }
  const found = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });
  return found ? fromPrisma(found) : null;
};

export const reconcileLocalEntitlement = async (userId: string): Promise<LocalSubscription | null> => {
  const subscription = await getLatestSubscription(userId);
  if (!subscription) return null;

  const now = new Date();
  const periodEnded =
    subscription.currentPeriodEnd !== null && subscription.currentPeriodEnd.getTime() <= now.getTime();
  let nextStatus = subscription.status;
  if (
    periodEnded &&
    (subscription.status === 'CANCELLED' ||
      subscription.status === 'PAST_DUE' ||
      (subscription.status === 'ACTIVE' && subscription.cancelAtPeriodEnd))
  ) {
    nextStatus = 'EXPIRED';
  }

  const plan = getEffectivePlan({
    status: nextStatus,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  }, now);

  if (nextStatus === subscription.status && plan === subscription.plan) {
    return { ...subscription, plan };
  }

  if (useMemoryStore()) {
    memoryStore.updateUser(userId, { plan });
    const updated = memoryStore.updateSubscription(subscription.id, { status: nextStatus, plan });
    return fromStore(updated);
  }

  const [updated] = await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { plan } }),
    prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: nextStatus, plan },
    }),
  ]);
  void updated;
  const latest = await prisma.subscription.findUnique({ where: { id: subscription.id } });
  return latest ? fromPrisma(latest) : { ...subscription, status: nextStatus, plan };
};

export const resolveEffectivePlan = async (userId: string): Promise<UserPlanId> => {
  const subscription = await reconcileLocalEntitlement(userId);
  return getEffectivePlan(subscription);
};

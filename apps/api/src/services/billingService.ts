import {
  BILLING_CURRENCY,
  PRO_MONTHLY_AMOUNT_PAISE,
  PRO_MONTHLY_PRICE_INR,
  PRO_PLAN_NAME,
  RAZORPAY_SUBSCRIPTION_TOTAL_COUNT,
  formatInrFromMajor,
  getBillingConfig,
  getEffectivePlan,
  type UserPlanId,
} from '@apicaptain/config';
import type {
  BillingStatusData,
  PaymentHistoryData,
  PublicUser,
  SubscribeData,
  VerifyPaymentRequest,
} from '@apicaptain/types';
import {
  getMockPaymentProvider,
  getPaymentProvider,
  mapProviderSubscription,
  mapRazorpayPaymentStatus,
  retrieveProviderPayment,
  retrieveProviderSubscription,
  verifyCheckoutPayment,
  type MappedSubscriptionState,
  type ProviderPayment,
  type ProviderSubscription,
} from '@apicaptain/billing';
import { AppError } from '../utils/errors.js';
import { memoryStore, useMemoryStore } from '../db/memoryStore.js';
import { prisma } from '../db/prisma.js';
import { getLatestSubscription, resolveEffectivePlan, type LocalSubscription } from './entitlementService.js';

const activeLike = new Set(['ACTIVE', 'TRIALING', 'PAST_DUE']);

const toBillingStatus = (userPlan: UserPlanId, subscription: LocalSubscription | null): BillingStatusData => {
  const plan = getEffectivePlan(subscription) || userPlan;
  return {
    plan,
    status: subscription?.status ?? 'INACTIVE',
    provider: subscription?.provider ?? 'NONE',
    currentPeriodStart: subscription?.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    cancelledAt: subscription?.cancelledAt?.toISOString() ?? null,
    priceMonthlyInr: plan === 'PRO' ? PRO_MONTHLY_PRICE_INR : 0,
    currency: BILLING_CURRENCY,
    amountPaise: plan === 'PRO' ? PRO_MONTHLY_AMOUNT_PAISE : 0,
    paymentMethod: null,
  };
};

const ensureSubscriptionRow = async (userId: string): Promise<LocalSubscription> => {
  const existing = await getLatestSubscription(userId);
  if (existing) return existing;
  if (useMemoryStore()) {
    return memoryStore.createSubscription({
      userId,
      plan: 'FREE',
      status: 'INACTIVE',
      provider: 'NONE',
    });
  }
  return prisma.subscription.create({
    data: { userId, plan: 'FREE', status: 'INACTIVE', provider: 'NONE' },
  });
};

const applyMappedState = async (
  userId: string,
  mapped: MappedSubscriptionState,
  extras?: { cancelAtPeriodEnd?: boolean; cancelledAt?: Date | null },
): Promise<LocalSubscription> => {
  const cancelAtPeriodEnd = extras?.cancelAtPeriodEnd ?? mapped.cancelAtPeriodEnd;
  const cancelledAt = extras?.cancelledAt ?? mapped.cancelledAt;
  const plan = getEffectivePlan({
    status: mapped.status,
    currentPeriodEnd: mapped.currentPeriodEnd,
    cancelAtPeriodEnd,
  });
  const data = {
    plan,
    status: mapped.status,
    provider: mapped.provider,
    providerCustomerId: mapped.providerCustomerId,
    providerSubscriptionId: mapped.providerSubscriptionId,
    providerPlanId: mapped.providerPlanId,
    currentPeriodStart: mapped.currentPeriodStart,
    currentPeriodEnd: mapped.currentPeriodEnd,
    cancelAtPeriodEnd,
    cancelledAt,
  };

  if (useMemoryStore()) {
    memoryStore.updateUser(userId, { plan });
    const current = memoryStore.getLatestSubscription(userId);
    if (!current) {
      return memoryStore.createSubscription({ userId, ...data });
    }
    return memoryStore.updateSubscription(current.id, data);
  }

  const current = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  const [_, subscription] = await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { plan } }),
    current
      ? prisma.subscription.update({ where: { id: current.id }, data })
      : prisma.subscription.create({ data: { userId, ...data } }),
  ]);
  void _;
  return subscription as LocalSubscription;
};

export const syncSubscriptionFromProvider = async (
  userId: string,
  providerSubscriptionId: string,
  extras?: { cancelAtPeriodEnd?: boolean; cancelledAt?: Date | null },
): Promise<LocalSubscription> => {
  const providerSub = await retrieveProviderSubscription(providerSubscriptionId);
  const mapped = mapProviderSubscription(providerSub, extras);
  return applyMappedState(userId, mapped, extras);
};

const recordPayment = async (
  userId: string,
  subscriptionId: string | null,
  payment: ProviderPayment,
): Promise<void> => {
  const status = mapRazorpayPaymentStatus(payment.status, payment.captured);
  const paidAt =
    status === 'CAPTURED' || status === 'AUTHORIZED' ? (payment.createdAt ?? new Date()) : null;
  const data = {
    userId,
    subscriptionId,
    provider: 'RAZORPAY' as const,
    providerPaymentId: payment.id,
    providerOrderId: payment.orderId,
    amount: Number.isInteger(payment.amount) ? payment.amount : PRO_MONTHLY_AMOUNT_PAISE,
    currency: payment.currency || BILLING_CURRENCY,
    status,
    paymentMethod: payment.method,
    invoiceUrl: payment.invoiceUrl,
    paidAt,
  };
  if (useMemoryStore()) {
    memoryStore.upsertPayment(data);
    return;
  }
  await prisma.payment.upsert({
    where: {
      provider_providerPaymentId: {
        provider: 'RAZORPAY',
        providerPaymentId: payment.id,
      },
    },
    create: data,
    update: {
      status: data.status,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      invoiceUrl: data.invoiceUrl,
      paidAt: data.paidAt,
      subscriptionId: data.subscriptionId,
    },
  });
};

export const getBillingStatus = async (user: PublicUser): Promise<BillingStatusData> => {
  const subscription = await getLatestSubscription(user.id);
  const shouldReconcile =
    Boolean(subscription?.providerSubscriptionId) && subscription?.status === 'INACTIVE';
  if (shouldReconcile && subscription?.providerSubscriptionId && subscription.provider === 'RAZORPAY') {
    try {
      await syncSubscriptionFromProvider(user.id, subscription.providerSubscriptionId, {
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        cancelledAt: subscription.cancelledAt,
      });
    } catch {
      // Local state remains available if the provider is temporarily unreachable.
    }
  }
  const latest = await getLatestSubscription(user.id);
  const plan = await resolveEffectivePlan(user.id);
  const status = toBillingStatus(plan, latest);
  if (useMemoryStore()) {
    const lastPayment = memoryStore.listPayments(user.id)[0];
    return { ...status, paymentMethod: lastPayment?.paymentMethod ?? null };
  }
  const lastPayment = await prisma.payment.findFirst({
    where: { userId: user.id, status: 'CAPTURED' },
    orderBy: { createdAt: 'desc' },
  });
  return { ...status, paymentMethod: lastPayment?.paymentMethod ?? null };
};

export const listBillingPayments = async (user: PublicUser): Promise<PaymentHistoryData> => {
  const payments = useMemoryStore()
    ? memoryStore.listPayments(user.id)
    : await prisma.payment.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

  return {
    payments: payments.map((item) => ({
      id: item.id,
      providerPaymentId: item.providerPaymentId,
      amount: item.amount,
      currency: item.currency,
      status: item.status,
      paidAt: item.paidAt ? item.paidAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      invoiceUrl: item.invoiceUrl,
    })),
  };
};

export const createProCheckout = async (user: PublicUser): Promise<SubscribeData> => {
  const current = await ensureSubscriptionRow(user.id);
  const plan = getEffectivePlan(current);
  if (plan === 'PRO' && activeLike.has(current.status) && !current.cancelAtPeriodEnd) {
    throw new AppError('ALREADY_PRO', 'You already have an active Pro subscription', 409, {
      subscriptionId: current.providerSubscriptionId,
      plan: 'PRO',
      status: current.status,
    });
  }

  const config = getBillingConfig();
  const provider = getPaymentProvider();

  if (
    current.providerSubscriptionId &&
    current.provider === 'RAZORPAY' &&
    (current.status === 'INACTIVE' || current.status === 'EXPIRED' || current.status === 'CANCELLED')
  ) {
    try {
      const existing = await provider.getSubscription(current.providerSubscriptionId);
      if (existing.status === 'created' || existing.status === 'authenticated') {
        return {
          subscriptionId: existing.id,
          provider: 'razorpay',
          keyId: provider.publicKey,
          plan: 'PRO',
          amountPaise: PRO_MONTHLY_AMOUNT_PAISE,
          currency: BILLING_CURRENCY,
          name: PRO_PLAN_NAME,
          description: `${formatInrFromMajor(PRO_MONTHLY_PRICE_INR)}/month`,
        };
      }
    } catch {
      // Create a fresh subscription if the previous provider id is unusable.
    }
  }

  let customerId = current.providerCustomerId;
  if (!customerId) {
    const customer = await provider.createCustomer({
      email: user.email,
      name: user.name,
      notes: { userId: user.id },
    });
    customerId = customer.id;
  }

  const created = await provider.createSubscription({
    customerId,
    planId: config.razorpayProPlanId,
    totalCount: RAZORPAY_SUBSCRIPTION_TOTAL_COUNT,
    notes: { userId: user.id },
  });

  await applyMappedState(user.id, {
    ...mapProviderSubscription(created),
    plan: 'FREE',
    status: 'INACTIVE',
    providerCustomerId: customerId,
  });

  return {
    subscriptionId: created.id,
    provider: 'razorpay',
    keyId: provider.publicKey,
    plan: 'PRO',
    amountPaise: PRO_MONTHLY_AMOUNT_PAISE,
    currency: BILLING_CURRENCY,
    name: PRO_PLAN_NAME,
    description: `${formatInrFromMajor(PRO_MONTHLY_PRICE_INR)}/month`,
  };
};

export const verifyProPayment = async (
  user: PublicUser,
  input: VerifyPaymentRequest,
): Promise<BillingStatusData> => {
  const subscription = await getLatestSubscription(user.id);
  if (!subscription?.providerSubscriptionId) {
    throw new AppError('SUBSCRIPTION_NOT_FOUND', 'No checkout subscription found', 404);
  }
  if (subscription.providerSubscriptionId !== input.razorpay_subscription_id) {
    throw new AppError('PAYMENT_VERIFICATION_FAILED', 'Subscription does not belong to this account', 403);
  }

  const valid = verifyCheckoutPayment({
    paymentId: input.razorpay_payment_id,
    subscriptionId: input.razorpay_subscription_id,
    signature: input.razorpay_signature,
  });
  if (!valid) {
    throw new AppError('PAYMENT_VERIFICATION_FAILED', 'Payment signature is invalid', 400);
  }

  let providerSub: ProviderSubscription;
  try {
    providerSub = await retrieveProviderSubscription(input.razorpay_subscription_id);
  } catch {
    throw new AppError('PAYMENT_VERIFICATION_FAILED', 'Could not confirm subscription with provider', 400);
  }

  if (['created'].includes(providerSub.status)) {
    if (getBillingConfig().billingProvider === 'mock') {
      getMockPaymentProvider().activate(providerSub.id);
      providerSub = await retrieveProviderSubscription(providerSub.id);
    }
  }

  const mapped = mapProviderSubscription(providerSub);
  if (mapped.status === 'INACTIVE' && providerSub.status !== 'paused') {
    throw new AppError('PAYMENT_VERIFICATION_FAILED', 'Provider has not activated this subscription', 400);
  }

  let payment: ProviderPayment | null = null;
  try {
    payment = await retrieveProviderPayment(input.razorpay_payment_id);
  } catch {
    payment = null;
  }

  const updated = await applyMappedState(user.id, {
    ...mapped,
    status: mapped.status === 'INACTIVE' ? 'ACTIVE' : mapped.status,
    plan: 'PRO',
  });

  if (payment) {
    await recordPayment(user.id, updated.id, payment);
  }

  return toBillingStatus('PRO', updated);
};

export const cancelCurrentSubscription = async (
  user: PublicUser,
  immediately = false,
): Promise<BillingStatusData> => {
  const subscription = await getLatestSubscription(user.id);
  if (!subscription?.providerSubscriptionId || !activeLike.has(subscription.status)) {
    throw new AppError('SUBSCRIPTION_NOT_ACTIVE', 'No active subscription to cancel', 400);
  }
  try {
    const cancelled = await getPaymentProvider().cancelSubscription(
      subscription.providerSubscriptionId,
      !immediately,
    );
    const mapped = mapProviderSubscription(cancelled, {
      cancelAtPeriodEnd: !immediately,
      cancelledAt: immediately ? new Date() : null,
    });
    const updated = await applyMappedState(user.id, mapped, {
      cancelAtPeriodEnd: !immediately,
      cancelledAt: immediately ? new Date() : null,
    });
    return toBillingStatus(getEffectivePlan(updated), updated);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('CANCELLATION_FAILED', 'Could not cancel the subscription', 502);
  }
};

export const reactivateCurrentSubscription = async (user: PublicUser): Promise<BillingStatusData> => {
  const subscription = await getLatestSubscription(user.id);
  if (!subscription?.providerSubscriptionId) {
    throw new AppError('SUBSCRIPTION_NOT_FOUND', 'No subscription found', 404);
  }
  try {
    const resumed = await getPaymentProvider().resumeSubscription(subscription.providerSubscriptionId);
    const mapped = mapProviderSubscription(resumed, { cancelAtPeriodEnd: false, cancelledAt: null });
    const updated = await applyMappedState(user.id, mapped, {
      cancelAtPeriodEnd: false,
      cancelledAt: null,
    });
    return toBillingStatus(getEffectivePlan(updated), updated);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      'REACTIVATION_FAILED',
      'Razorpay does not support undoing a scheduled cancellation. Resume is only available for paused subscriptions.',
      400,
    );
  }
};

export const findSubscriptionForWebhook = async (
  providerSub: ProviderSubscription | null,
  payment: ProviderPayment | null,
): Promise<LocalSubscription | null> => {
  const notesUserId = providerSub?.notes.userId || payment?.notes.userId;
  if (notesUserId) {
    const byUser = await getLatestSubscription(notesUserId);
    if (byUser) return byUser;
  }
  const providerId = providerSub?.id;
  if (providerId) {
    if (useMemoryStore()) {
      return memoryStore.findSubscriptionByProviderId('RAZORPAY', providerId);
    }
    const found = await prisma.subscription.findFirst({
      where: { provider: 'RAZORPAY', providerSubscriptionId: providerId },
    });
    if (found) return found as LocalSubscription;
  }
  const customerId = providerSub?.customerId || payment?.customerId;
  if (customerId) {
    if (useMemoryStore()) {
      return memoryStore.findSubscriptionByCustomerId('RAZORPAY', customerId);
    }
    const found = await prisma.subscription.findFirst({
      where: { provider: 'RAZORPAY', providerCustomerId: customerId },
    });
    if (found) return found as LocalSubscription;
  }
  return null;
};

export const applyWebhookSubscription = async (
  local: LocalSubscription,
  providerSub: ProviderSubscription,
  extras?: { cancelAtPeriodEnd?: boolean; cancelledAt?: Date | null },
): Promise<LocalSubscription> => {
  const mapped = mapProviderSubscription(providerSub, extras);
  return applyMappedState(local.userId, mapped, extras);
};

export const applyWebhookPayment = async (
  local: LocalSubscription,
  payment: ProviderPayment,
): Promise<void> => {
  await recordPayment(local.userId, local.id, payment);
};

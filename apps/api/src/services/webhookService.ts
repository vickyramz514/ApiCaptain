import { getPaymentProvider, type WebhookEnvelope } from '@apicaptain/billing';
import { AppError } from '../utils/errors.js';
import { memoryStore, useMemoryStore } from '../db/memoryStore.js';
import { prisma } from '../db/prisma.js';
import {
  applyWebhookPayment,
  applyWebhookSubscription,
  findSubscriptionForWebhook,
} from './billingService.js';

type WebhookHandler = (envelope: WebhookEnvelope) => Promise<void>;

const logWebhook = (fields: Record<string, unknown>): void => {
  console.info('[billing:webhook]', fields);
};

const beginWebhook = async (
  eventId: string,
  eventType: string,
  payloadHash: string,
): Promise<{ alreadyProcessed: boolean }> => {
  if (useMemoryStore()) {
    const existing = memoryStore.getWebhookEvent('RAZORPAY', eventId);
    if (existing?.processed) return { alreadyProcessed: true };
    if (!existing) {
      memoryStore.createWebhookEvent({
        provider: 'RAZORPAY',
        eventId,
        eventType,
        payloadHash,
        processed: false,
        processedAt: null,
        failureReason: null,
      });
    }
    return { alreadyProcessed: false };
  }

  const existing = await prisma.webhookEvent.findUnique({
    where: { provider_eventId: { provider: 'RAZORPAY', eventId } },
  });
  if (existing?.processed) return { alreadyProcessed: true };
  if (!existing) {
    await prisma.webhookEvent.create({
      data: {
        provider: 'RAZORPAY',
        eventId,
        eventType,
        payloadHash,
        processed: false,
      },
    });
  }
  return { alreadyProcessed: false };
};

const markProcessed = async (eventId: string, failureReason?: string): Promise<void> => {
  if (useMemoryStore()) {
    memoryStore.updateWebhookEvent('RAZORPAY', eventId, {
      processed: !failureReason,
      processedAt: failureReason ? null : new Date(),
      failureReason: failureReason ?? null,
    });
    return;
  }
  await prisma.webhookEvent.update({
    where: { provider_eventId: { provider: 'RAZORPAY', eventId } },
    data: failureReason
      ? { failureReason, processed: false }
      : { processed: true, processedAt: new Date(), failureReason: null },
  });
};

const requireLocal = async (envelope: WebhookEnvelope) => {
  const local = await findSubscriptionForWebhook(envelope.subscription, envelope.payment);
  if (!local) {
    logWebhook({
      eventId: envelope.eventId,
      eventType: envelope.eventType,
      status: 'ignored',
      reason: 'subscription_not_found',
    });
    return null;
  }
  return local;
};

const handleActivated: WebhookHandler = async (envelope) => {
  if (!envelope.subscription) return;
  const local = await requireLocal(envelope);
  if (!local) return;
  await applyWebhookSubscription(local, envelope.subscription);
  if (envelope.payment) await applyWebhookPayment(local, envelope.payment);
};

const handleCharged: WebhookHandler = async (envelope) => {
  if (!envelope.subscription) return;
  const local = await requireLocal(envelope);
  if (!local) return;
  await applyWebhookSubscription(local, {
    ...envelope.subscription,
    status: envelope.subscription.status === 'created' ? 'active' : envelope.subscription.status,
  });
  if (envelope.payment) await applyWebhookPayment(local, envelope.payment);
};

const handlePastDue: WebhookHandler = async (envelope) => {
  if (!envelope.subscription) return;
  const local = await requireLocal(envelope);
  if (!local) return;
  await applyWebhookSubscription(local, { ...envelope.subscription, status: 'pending' });
  if (envelope.payment) await applyWebhookPayment(local, envelope.payment);
};

const handleCancelled: WebhookHandler = async (envelope) => {
  if (!envelope.subscription) return;
  const local = await requireLocal(envelope);
  if (!local) return;
  await applyWebhookSubscription(local, envelope.subscription, {
    cancelAtPeriodEnd: false,
    cancelledAt: envelope.subscription.endedAt ?? new Date(),
  });
};

const handleExpired: WebhookHandler = async (envelope) => {
  if (!envelope.subscription) return;
  const local = await requireLocal(envelope);
  if (!local) return;
  await applyWebhookSubscription(local, { ...envelope.subscription, status: 'completed' });
};

const handlePaused: WebhookHandler = async (envelope) => {
  if (!envelope.subscription) return;
  const local = await requireLocal(envelope);
  if (!local) return;
  await applyWebhookSubscription(local, { ...envelope.subscription, status: 'paused' });
};

const handleResumed: WebhookHandler = async (envelope) => {
  if (!envelope.subscription) return;
  const local = await requireLocal(envelope);
  if (!local) return;
  await applyWebhookSubscription(local, { ...envelope.subscription, status: 'active' }, {
    cancelAtPeriodEnd: false,
    cancelledAt: null,
  });
};

const handlePaymentCaptured: WebhookHandler = async (envelope) => {
  const local = await requireLocal(envelope);
  if (!local || !envelope.payment) return;
  await applyWebhookPayment(local, envelope.payment);
  if (envelope.subscription) {
    await applyWebhookSubscription(local, envelope.subscription);
  }
};

const handlePaymentFailed: WebhookHandler = async (envelope) => {
  const local = await requireLocal(envelope);
  if (!local) return;
  if (envelope.payment) await applyWebhookPayment(local, envelope.payment);
  if (envelope.subscription) {
    await applyWebhookSubscription(local, {
      ...envelope.subscription,
      status: envelope.subscription.status === 'active' ? 'pending' : envelope.subscription.status,
    });
  }
};

const EVENT_HANDLERS: Record<string, WebhookHandler> = {
  'subscription.authenticated': handleActivated,
  'subscription.activated': handleActivated,
  'subscription.charged': handleCharged,
  'subscription.updated': handleActivated,
  'subscription.pending': handlePastDue,
  'subscription.halted': handlePastDue,
  'subscription.cancelled': handleCancelled,
  'subscription.completed': handleExpired,
  'subscription.paused': handlePaused,
  'subscription.resumed': handleResumed,
  'payment.captured': handlePaymentCaptured,
  'payment.authorized': handlePaymentCaptured,
  'payment.failed': handlePaymentFailed,
};

export const processRazorpayWebhook = async (
  rawBody: Buffer | string,
  signature: string,
): Promise<{ duplicate: boolean; eventType: string }> => {
  const provider = getPaymentProvider();
  if (!provider.verifyWebhook(rawBody, signature)) {
    logWebhook({ status: 'rejected', reason: 'invalid_signature' });
    throw new AppError('WEBHOOK_SIGNATURE_INVALID', 'Invalid webhook signature', 400);
  }

  const envelope = provider.parseWebhook(rawBody);
  const { alreadyProcessed } = await beginWebhook(
    envelope.eventId,
    envelope.eventType,
    envelope.payloadHash,
  );

  if (alreadyProcessed) {
    logWebhook({
      eventId: envelope.eventId,
      eventType: envelope.eventType,
      status: 'duplicate',
    });
    return { duplicate: true, eventType: envelope.eventType };
  }

  const handler = EVENT_HANDLERS[envelope.eventType];
  try {
    if (handler) {
      await handler(envelope);
    } else {
      logWebhook({
        eventId: envelope.eventId,
        eventType: envelope.eventType,
        status: 'ignored',
        reason: 'unknown_event',
      });
    }
    await markProcessed(envelope.eventId);
    logWebhook({
      eventId: envelope.eventId,
      eventType: envelope.eventType,
      status: 'processed',
    });
    return { duplicate: false, eventType: envelope.eventType };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'processing_failed';
    await markProcessed(envelope.eventId, reason.slice(0, 180));
    logWebhook({
      eventId: envelope.eventId,
      eventType: envelope.eventType,
      status: 'failed',
      reason,
    });
    throw error;
  }
};

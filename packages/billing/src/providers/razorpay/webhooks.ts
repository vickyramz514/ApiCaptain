import { sha256Hex, verifyHmacSignature } from '../../crypto.js';
import type { ProviderPayment, ProviderSubscription, WebhookEnvelope } from '../../types/index.js';
import { asRecord, asString, nestedEntity, toProviderPayment, toProviderSubscription } from './map.js';

export const RAZORPAY_WEBHOOK_EVENTS = [
  'subscription.authenticated',
  'subscription.activated',
  'subscription.charged',
  'subscription.pending',
  'subscription.halted',
  'subscription.cancelled',
  'subscription.completed',
  'subscription.paused',
  'subscription.resumed',
  'subscription.updated',
  'payment.captured',
  'payment.failed',
  'payment.authorized',
] as const;

export type RazorpayWebhookEvent = (typeof RAZORPAY_WEBHOOK_EVENTS)[number];

export const verifyRazorpayWebhookSignature = (
  webhookSecret: string,
  rawBody: Buffer | string,
  signature: string,
): boolean => verifyHmacSignature(webhookSecret, rawBody, signature);

export const deriveWebhookEventId = (payload: Record<string, unknown>): string => {
  const explicit = asString(payload.id);
  if (explicit) return explicit;
  const event = asString(payload.event) ?? 'unknown';
  const subscription = nestedEntity(payload, 'subscription');
  const payment = nestedEntity(payload, 'payment');
  const createdAt = payload.created_at ?? '';
  return `${event}:${asString(subscription?.id) ?? ''}:${asString(payment?.id) ?? ''}:${String(createdAt)}`;
};

export const parseRazorpayWebhook = (rawBody: Buffer | string): WebhookEnvelope => {
  const text = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
  const parsed = asRecord(JSON.parse(text) as unknown);
  const subscriptionEntity = nestedEntity(parsed, 'subscription');
  const paymentEntity = nestedEntity(parsed, 'payment');
  const subscription: ProviderSubscription | null = subscriptionEntity
    ? toProviderSubscription(subscriptionEntity)
    : null;
  const payment: ProviderPayment | null = paymentEntity ? toProviderPayment(paymentEntity) : null;

  return {
    eventId: deriveWebhookEventId(parsed),
    eventType: asString(parsed.event) ?? 'unknown',
    payloadHash: sha256Hex(rawBody),
    subscription,
    payment,
    raw: parsed,
  };
};

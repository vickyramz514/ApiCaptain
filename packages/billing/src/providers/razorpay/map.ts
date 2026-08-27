import type { SubscriptionStatusId } from '@apicaptain/config';
import type { PaymentStatusId, ProviderPayment, ProviderSubscription } from '../../types/index.js';

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const asString = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);

const asNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const unixToDate = (value: unknown): Date | null => {
  const seconds = asNumber(value);
  if (seconds === null || seconds <= 0) return null;
  return new Date(seconds * 1000);
};

const notesFrom = (value: unknown): Record<string, string> => {
  const record = asRecord(value);
  const notes: Record<string, string> = {};
  for (const [key, item] of Object.entries(record)) {
    if (typeof item === 'string') notes[key] = item;
  }
  return notes;
};

export const mapRazorpaySubscriptionStatus = (status: string): SubscriptionStatusId => {
  switch (status) {
    case 'active':
    case 'authenticated':
      return 'ACTIVE';
    case 'pending':
    case 'halted':
      return 'PAST_DUE';
    case 'cancelled':
      return 'CANCELLED';
    case 'completed':
    case 'expired':
      return 'EXPIRED';
    case 'paused':
    case 'created':
    default:
      return 'INACTIVE';
  }
};

export const mapRazorpayPaymentStatus = (status: string, captured?: boolean): PaymentStatusId => {
  switch (status) {
    case 'authorized':
      return 'AUTHORIZED';
    case 'captured':
      return 'CAPTURED';
    case 'failed':
      return 'FAILED';
    case 'refunded':
      return 'REFUNDED';
    case 'created':
      return 'CREATED';
    default:
      return captured ? 'CAPTURED' : 'CREATED';
  }
};

export const toProviderSubscription = (raw: Record<string, unknown>): ProviderSubscription => ({
  id: asString(raw.id) ?? '',
  customerId: asString(raw.customer_id),
  planId: asString(raw.plan_id),
  status: asString(raw.status) ?? 'created',
  currentPeriodStart: unixToDate(raw.current_start),
  currentPeriodEnd: unixToDate(raw.current_end),
  endedAt: unixToDate(raw.ended_at),
  cancelAtPeriodEnd: false,
  notes: notesFrom(raw.notes),
  raw,
});

export const toProviderPayment = (raw: Record<string, unknown>): ProviderPayment => ({
  id: asString(raw.id) ?? '',
  amount: asNumber(raw.amount) ?? 0,
  currency: (asString(raw.currency) ?? 'INR').toUpperCase(),
  status: asString(raw.status) ?? 'created',
  method: asString(raw.method),
  orderId: asString(raw.order_id),
  invoiceId: asString(raw.invoice_id),
  invoiceUrl: asString(raw.short_url) ?? asString(asRecord(raw.invoice).short_url),
  email: asString(raw.email),
  customerId: asString(raw.customer_id),
  createdAt: unixToDate(raw.created_at),
  captured: raw.captured === true,
  notes: notesFrom(raw.notes),
  raw,
});

export const nestedEntity = (
  payload: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null => {
  const wrapper = asRecord(asRecord(payload.payload)[key]);
  const entity = asRecord(wrapper.entity);
  return entity.id ? entity : Object.keys(entity).length > 0 ? entity : null;
};

export { asRecord, asString };

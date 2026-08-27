import type { BillingProviderId, SubscriptionStatusId, UserPlanId } from '@apicaptain/config';

export type BillingProviderName = Exclude<BillingProviderId, 'NONE'>;

export type PaymentStatusId = 'CREATED' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';

export interface ProviderCustomer {
  id: string;
  email?: string;
  name?: string | null;
}

export interface ProviderSubscription {
  id: string;
  customerId: string | null;
  planId: string | null;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  endedAt: Date | null;
  cancelAtPeriodEnd: boolean;
  notes: Record<string, string>;
  raw: Record<string, unknown>;
}

export interface ProviderPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  orderId: string | null;
  invoiceId: string | null;
  invoiceUrl: string | null;
  email: string | null;
  customerId: string | null;
  createdAt: Date | null;
  captured: boolean;
  notes: Record<string, string>;
  raw: Record<string, unknown>;
}

export interface ProviderPaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  invoiceUrl: string | null;
  paidAt: Date | null;
}

export interface CreateCustomerInput {
  email: string;
  name?: string | null;
  notes?: Record<string, string>;
}

export interface CreateSubscriptionInput {
  customerId: string;
  planId: string;
  totalCount: number;
  notes?: Record<string, string>;
}

export interface CheckoutVerificationInput {
  paymentId: string;
  subscriptionId: string;
  signature: string;
}

export interface MappedSubscriptionState {
  plan: UserPlanId;
  status: SubscriptionStatusId;
  provider: BillingProviderName;
  providerCustomerId: string | null;
  providerSubscriptionId: string;
  providerPlanId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: Date | null;
}

export interface WebhookEnvelope {
  eventId: string;
  eventType: string;
  payloadHash: string;
  subscription: ProviderSubscription | null;
  payment: ProviderPayment | null;
  raw: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly name: BillingProviderName;
  readonly publicKey: string;
  createCustomer(input: CreateCustomerInput): Promise<ProviderCustomer>;
  createSubscription(input: CreateSubscriptionInput): Promise<ProviderSubscription>;
  getSubscription(id: string): Promise<ProviderSubscription>;
  cancelSubscription(id: string, cancelAtPeriodEnd: boolean): Promise<ProviderSubscription>;
  resumeSubscription(id: string): Promise<ProviderSubscription>;
  getPayment(id: string): Promise<ProviderPayment>;
  getPaymentHistory(subscriptionId: string): Promise<ProviderPaymentHistoryItem[]>;
  verifyPayment(input: CheckoutVerificationInput): boolean;
  verifyWebhook(rawBody: Buffer | string, signature: string): boolean;
  parseWebhook(rawBody: Buffer | string): WebhookEnvelope;
}

export type SubscriptionProvider = Pick<
  PaymentProvider,
  | 'createCustomer'
  | 'createSubscription'
  | 'getSubscription'
  | 'cancelSubscription'
  | 'resumeSubscription'
>;

export type PaymentVerificationProvider = Pick<PaymentProvider, 'verifyPayment' | 'getPayment'>;

export type WebhookProvider = Pick<PaymentProvider, 'verifyWebhook' | 'parseWebhook'>;

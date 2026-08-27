import {
  PRO_MONTHLY_AMOUNT_PAISE,
  RAZORPAY_SUBSCRIPTION_TOTAL_COUNT,
  getBillingConfig,
  type BillingConfig,
} from '@apicaptain/config';
import { hmacSha256Hex } from '../crypto.js';
import { billingProviderError } from '../errors.js';
import { parseRazorpayWebhook, verifyRazorpayWebhookSignature } from './razorpay/webhooks.js';
import type {
  CheckoutVerificationInput,
  CreateCustomerInput,
  CreateSubscriptionInput,
  PaymentProvider,
  ProviderCustomer,
  ProviderPayment,
  ProviderPaymentHistoryItem,
  ProviderSubscription,
  WebhookEnvelope,
} from '../types/index.js';

type MockSubscription = ProviderSubscription & { paused?: boolean };

/** In-memory Razorpay stand-in for unit/API tests. Never talks to the network. */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'RAZORPAY' as const;
  customers = new Map<string, ProviderCustomer>();
  subscriptions = new Map<string, MockSubscription>();
  payments = new Map<string, ProviderPayment>();
  createCustomerCalls = 0;
  createSubscriptionCalls = 0;

  constructor(private readonly config: BillingConfig = getBillingConfig()) {}

  get publicKey(): string {
    return this.config.razorpayKeyId || 'rzp_test_mock';
  }

  reset(): void {
    this.customers.clear();
    this.subscriptions.clear();
    this.payments.clear();
    this.createCustomerCalls = 0;
    this.createSubscriptionCalls = 0;
  }

  async createCustomer(input: CreateCustomerInput): Promise<ProviderCustomer> {
    this.createCustomerCalls += 1;
    const existing = [...this.customers.values()].find((item) => item.email === input.email);
    if (existing) return existing;
    const customer: ProviderCustomer = {
      id: `cust_mock_${this.customers.size + 1}`,
      email: input.email,
      name: input.name ?? null,
    };
    this.customers.set(customer.id, customer);
    return customer;
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<ProviderSubscription> {
    this.createSubscriptionCalls += 1;
    const now = Math.floor(Date.now() / 1000);
    const periodEnd = now + 30 * 24 * 60 * 60;
    const subscription: MockSubscription = {
      id: `sub_mock_${this.subscriptions.size + 1}`,
      customerId: input.customerId,
      planId: input.planId || this.config.razorpayProPlanId || 'plan_mock_pro',
      status: 'created',
      currentPeriodStart: null,
      currentPeriodEnd: new Date(periodEnd * 1000),
      endedAt: null,
      cancelAtPeriodEnd: false,
      notes: input.notes ?? {},
      raw: {
        id: `sub_mock_${this.subscriptions.size + 1}`,
        status: 'created',
        plan_id: input.planId,
        customer_id: input.customerId,
        total_count: input.totalCount || RAZORPAY_SUBSCRIPTION_TOTAL_COUNT,
      },
    };
    this.subscriptions.set(subscription.id, subscription);
    return subscription;
  }

  async getSubscription(id: string): Promise<ProviderSubscription> {
    const subscription = this.subscriptions.get(id);
    if (!subscription) throw billingProviderError('Subscription not found');
    return subscription;
  }

  async cancelSubscription(id: string, cancelAtPeriodEnd = true): Promise<ProviderSubscription> {
    const subscription = this.subscriptions.get(id);
    if (!subscription) throw billingProviderError('Subscription not found');
    subscription.cancelAtPeriodEnd = cancelAtPeriodEnd;
    if (cancelAtPeriodEnd) {
      subscription.status = 'active';
    } else {
      subscription.status = 'cancelled';
      subscription.endedAt = new Date();
    }
    return subscription;
  }

  async resumeSubscription(id: string): Promise<ProviderSubscription> {
    const subscription = this.subscriptions.get(id);
    if (!subscription) throw billingProviderError('Subscription not found');
    if (subscription.status !== 'paused' && !subscription.paused) {
      throw billingProviderError('Resume is only allowed for paused subscriptions');
    }
    subscription.paused = false;
    subscription.status = 'active';
    return subscription;
  }

  async getPayment(id: string): Promise<ProviderPayment> {
    const existing = this.payments.get(id);
    if (existing) return existing;
    const payment: ProviderPayment = {
      id,
      amount: PRO_MONTHLY_AMOUNT_PAISE,
      currency: 'INR',
      status: 'captured',
      method: 'card',
      orderId: null,
      invoiceId: null,
      invoiceUrl: null,
      email: null,
      customerId: null,
      createdAt: new Date(),
      captured: true,
      notes: {},
      raw: { id, amount: PRO_MONTHLY_AMOUNT_PAISE, status: 'captured', captured: true },
    };
    this.payments.set(id, payment);
    return payment;
  }

  async getPaymentHistory(subscriptionId: string): Promise<ProviderPaymentHistoryItem[]> {
    return [...this.payments.values()]
      .filter((item) => item.notes.subscriptionId === subscriptionId || !item.notes.subscriptionId)
      .map((item) => ({
        id: item.id,
        amount: item.amount,
        currency: item.currency,
        status: item.status,
        method: item.method,
        invoiceUrl: item.invoiceUrl,
        paidAt: item.createdAt,
      }));
  }

  verifyPayment(input: CheckoutVerificationInput): boolean {
    if (!this.subscriptions.has(input.subscriptionId)) return false;
    const payload = `${input.paymentId}|${input.subscriptionId}`;
    const expected = hmacSha256Hex(this.config.razorpayKeySecret, payload);
    return expected === input.signature;
  }

  verifyWebhook(rawBody: Buffer | string, signature: string): boolean {
    return verifyRazorpayWebhookSignature(this.config.razorpayWebhookSecret, rawBody, signature);
  }

  parseWebhook(rawBody: Buffer | string): WebhookEnvelope {
    return parseRazorpayWebhook(rawBody);
  }

  activate(id: string): ProviderSubscription {
    const subscription = this.subscriptions.get(id);
    if (!subscription) throw billingProviderError('Subscription not found');
    const start = new Date();
    const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    subscription.status = 'active';
    subscription.currentPeriodStart = start;
    subscription.currentPeriodEnd = end;
    return subscription;
  }
}

let mockSingleton: MockPaymentProvider | null = null;

export const getMockPaymentProvider = (config?: BillingConfig): MockPaymentProvider => {
  if (!mockSingleton) mockSingleton = new MockPaymentProvider(config ?? getBillingConfig());
  return mockSingleton;
};

export const resetMockPaymentProvider = (): void => {
  mockSingleton?.reset();
};

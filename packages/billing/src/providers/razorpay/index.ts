import {
  getBillingConfig,
  RAZORPAY_SUBSCRIPTION_TOTAL_COUNT,
  type BillingConfig,
} from '@apicaptain/config';
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
} from '../../types/index.js';
import { createRazorpaySdk, type RazorpaySdkLike } from './client.js';
import { fetchRazorpayPayment, listRazorpayInvoices, verifyRazorpayCheckoutSignature } from './payments.js';
import {
  cancelRazorpaySubscription,
  createRazorpayCustomer,
  createRazorpaySubscription,
  fetchRazorpaySubscription,
  resumeRazorpaySubscription,
} from './subscriptions.js';
import { parseRazorpayWebhook, verifyRazorpayWebhookSignature } from './webhooks.js';

export class RazorpayProvider implements PaymentProvider {
  readonly name = 'RAZORPAY' as const;

  constructor(
    private readonly config: BillingConfig,
    private readonly client: RazorpaySdkLike = createRazorpaySdk(config),
  ) {}

  get publicKey(): string {
    return this.config.razorpayKeyId;
  }

  createCustomer(input: CreateCustomerInput): Promise<ProviderCustomer> {
    return createRazorpayCustomer(this.client, input);
  }

  createSubscription(input: CreateSubscriptionInput): Promise<ProviderSubscription> {
    return createRazorpaySubscription(this.client, this.config, {
      ...input,
      planId: input.planId || this.config.razorpayProPlanId,
      totalCount: input.totalCount || RAZORPAY_SUBSCRIPTION_TOTAL_COUNT,
    });
  }

  getSubscription(id: string): Promise<ProviderSubscription> {
    return fetchRazorpaySubscription(this.client, id);
  }

  cancelSubscription(id: string, cancelAtPeriodEnd = true): Promise<ProviderSubscription> {
    return cancelRazorpaySubscription(this.client, id, cancelAtPeriodEnd);
  }

  resumeSubscription(id: string): Promise<ProviderSubscription> {
    return resumeRazorpaySubscription(this.client, id);
  }

  getPayment(id: string): Promise<ProviderPayment> {
    return fetchRazorpayPayment(this.client, id);
  }

  getPaymentHistory(subscriptionId: string): Promise<ProviderPaymentHistoryItem[]> {
    return listRazorpayInvoices(this.client, subscriptionId);
  }

  verifyPayment(input: CheckoutVerificationInput): boolean {
    return verifyRazorpayCheckoutSignature(this.config.razorpayKeySecret, input);
  }

  verifyWebhook(rawBody: Buffer | string, signature: string): boolean {
    return verifyRazorpayWebhookSignature(this.config.razorpayWebhookSecret, rawBody, signature);
  }

  parseWebhook(rawBody: Buffer | string): WebhookEnvelope {
    return parseRazorpayWebhook(rawBody);
  }
}

export const createRazorpayProvider = (
  config = getBillingConfig(),
  client?: RazorpaySdkLike,
): RazorpayProvider => new RazorpayProvider(config, client ?? createRazorpaySdk(config));

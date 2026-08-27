import { billingProviderError } from '../../errors.js';
import type { CheckoutVerificationInput, ProviderPayment, ProviderPaymentHistoryItem } from '../../types/index.js';
import { verifyHmacSignature } from '../../crypto.js';
import type { RazorpaySdkLike } from './client.js';
import { wrapProviderCall } from './client.js';
import { toProviderPayment } from './map.js';

export const verifyRazorpayCheckoutSignature = (
  keySecret: string,
  input: CheckoutVerificationInput,
): boolean => {
  if (!input.paymentId || !input.subscriptionId || !input.signature) return false;
  const payload = `${input.paymentId}|${input.subscriptionId}`;
  return verifyHmacSignature(keySecret, payload, input.signature);
};

export const fetchRazorpayPayment = async (
  client: RazorpaySdkLike,
  id: string,
): Promise<ProviderPayment> => {
  const raw = await wrapProviderCall('getPayment', () => client.payments.fetch(id));
  const payment = toProviderPayment(raw);
  if (!payment.id) throw billingProviderError('Razorpay payment fetch returned no id');
  return payment;
};

export const listRazorpayInvoices = async (
  client: RazorpaySdkLike,
  subscriptionId: string,
): Promise<ProviderPaymentHistoryItem[]> => {
  const result = await wrapProviderCall('getPaymentHistory', () =>
    client.invoices.all({ subscription_id: subscriptionId, count: 20 }),
  );
  return (result.items ?? []).map((item) => {
    const payment = toProviderPayment(item);
    return {
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      invoiceUrl: payment.invoiceUrl,
      paidAt: payment.createdAt,
    };
  });
};

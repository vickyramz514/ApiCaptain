export class BillingError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = 'BillingError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const billingProviderError = (message: string): BillingError =>
  new BillingError('BILLING_PROVIDER_ERROR', message, 502);

/** Shared runtime configuration helpers. */

export type UserPlanId = 'FREE' | 'PRO';

export type PlanFeature =
  | 'savedProjects'
  | 'generationHistory'
  | 'unlimitedGenerations'
  | 'unlimitedProjects'
  | 'largeOpenApi'
  | 'priorityProcessing';

export interface PlanLimits {
  generationsPerMonth: number | null;
  projects: number | null;
  maxOpenApiBytes: number;
  maxEndpoints: number;
}

export interface PlanFeatures {
  savedProjects: boolean;
  generationHistory: boolean;
  unlimitedGenerations: boolean;
  unlimitedProjects: boolean;
  largeOpenApi: boolean;
  priorityProcessing: boolean;
}

export const BILLING_CURRENCY = 'INR' as const;
export const PRO_MONTHLY_PRICE_INR = 499;
export const PAISA_PER_INR = 100;
export const PRO_MONTHLY_AMOUNT_PAISE = PRO_MONTHLY_PRICE_INR * PAISA_PER_INR;
export const PRO_PLAN_NAME = 'ApiCaptain Pro';
export const RAZORPAY_SUBSCRIPTION_TOTAL_COUNT = 120;

export const inrToPaise = (majorUnits: number): number =>
  Math.round(majorUnits * PAISA_PER_INR);

export const paiseToInr = (paise: number): number => Math.round(paise) / PAISA_PER_INR;

export const formatInrFromMajor = (majorUnits: number): string => `₹${majorUnits}`;

export const formatInrFromPaise = (paise: number): string =>
  formatInrFromMajor(Math.round(paise / PAISA_PER_INR));

export type SubscriptionStatusId =
  | 'ACTIVE'
  | 'TRIALING'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'INACTIVE';

export type BillingProviderId = 'NONE' | 'RAZORPAY' | 'STRIPE';

export interface SubscriptionEntitlementInput {
  status: SubscriptionStatusId;
  currentPeriodEnd?: Date | string | null;
  cancelAtPeriodEnd?: boolean;
}

export const hasActiveEntitlement = (
  subscription: SubscriptionEntitlementInput | null | undefined,
  now = new Date(),
): boolean => {
  if (!subscription) return false;
  const end = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).getTime()
    : Number.NaN;
  const periodOpen = Number.isFinite(end) && end > now.getTime();

  switch (subscription.status) {
    case 'ACTIVE':
    case 'TRIALING':
      return true;
    case 'PAST_DUE':
      return !Number.isFinite(end) || periodOpen;
    case 'CANCELLED':
      return periodOpen;
    case 'EXPIRED':
    case 'INACTIVE':
    default:
      return false;
  }
};

export const getEffectivePlan = (
  subscription: SubscriptionEntitlementInput | null | undefined,
  now = new Date(),
): UserPlanId => (hasActiveEntitlement(subscription, now) ? 'PRO' : 'FREE');

export interface PricingPlan {
  id: UserPlanId;
  name: string;
  priceMonthlyInr: number;
  currency: 'INR';
  ctaLabel: string;
  ctaMode: 'current' | 'coming_soon' | 'upgrade' | 'contact';
  highlights: string[];
}

export const PLAN_LIMITS: Record<UserPlanId, PlanLimits> = {
  FREE: {
    generationsPerMonth: 50,
    projects: 5,
    maxOpenApiBytes: 10 * 1024 * 1024,
    maxEndpoints: 1_000,
  },
  PRO: {
    generationsPerMonth: null,
    projects: null,
    maxOpenApiBytes: 50 * 1024 * 1024,
    maxEndpoints: 5_000,
  },
};

export const PLAN_FEATURES: Record<UserPlanId, PlanFeatures> = {
  FREE: {
    savedProjects: true,
    generationHistory: true,
    unlimitedGenerations: false,
    unlimitedProjects: false,
    largeOpenApi: false,
    priorityProcessing: false,
  },
  PRO: {
    savedProjects: true,
    generationHistory: true,
    unlimitedGenerations: true,
    unlimitedProjects: true,
    largeOpenApi: true,
    priorityProcessing: true,
  },
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'FREE',
    name: 'Free',
    priceMonthlyInr: 0,
    currency: BILLING_CURRENCY,
    ctaLabel: 'Get started',
    ctaMode: 'current',
    highlights: [
      '50 generations / month',
      '5 saved projects',
      'OpenAPI generator',
      'React Native, Flutter, Swift, Kotlin, Python',
    ],
  },
  {
    id: 'PRO',
    name: 'Pro',
    priceMonthlyInr: PRO_MONTHLY_PRICE_INR,
    currency: BILLING_CURRENCY,
    ctaLabel: 'Upgrade to Pro',
    ctaMode: 'upgrade',
    highlights: [
      'Unlimited generations',
      'Unlimited projects',
      'Larger OpenAPI files',
      'Advanced generation & priority processing',
    ],
  },
];

export const canUseFeature = (plan: UserPlanId, feature: PlanFeature): boolean =>
  Boolean(PLAN_FEATURES[plan]?.[feature]);

export const getPlanLimits = (plan: UserPlanId): PlanLimits => PLAN_LIMITS[plan];

export const isUnlimitedGenerations = (plan: UserPlanId): boolean =>
  canUseFeature(plan, 'unlimitedGenerations') || PLAN_LIMITS[plan].generationsPerMonth === null;

export const isUnlimitedProjects = (plan: UserPlanId): boolean =>
  canUseFeature(plan, 'unlimitedProjects') || PLAN_LIMITS[plan].projects === null;

export interface ApiConfig {
  host: string;
  port: number;
  corsOrigin: string;
  nodeEnv: string;
  databaseUrl: string;
  bodyLimit: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  authSecret: string;
  appUrl: string;
  sessionTtlDays: number;
  passwordResetTtlMinutes: number;
}

export interface BillingConfig {
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayWebhookSecret: string;
  razorpayProPlanId: string;
  billingProvider: 'razorpay' | 'mock';
}

export interface WebConfig {
  apiUrl: string;
  nodeEnv: string;
  siteUrl: string;
}

export type EnvMap = Record<string, string | undefined>;

const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readEnv = (env?: EnvMap): EnvMap =>
  env ?? (globalThis as { process?: { env?: EnvMap } }).process?.env ?? {};

export const getApiConfig = (env?: EnvMap): ApiConfig => {
  const source = readEnv(env);
  return {
    host: source.API_HOST ?? '0.0.0.0',
    port: toNumber(source.API_PORT, 4000),
    corsOrigin: source.CORS_ORIGIN ?? 'http://localhost:3000',
    nodeEnv: source.NODE_ENV ?? 'development',
    databaseUrl: source.DATABASE_URL ?? '',
    bodyLimit: source.BODY_LIMIT ?? '2mb',
    rateLimitWindowMs: toNumber(source.RATE_LIMIT_WINDOW_MS, 60_000),
    rateLimitMax: toNumber(source.RATE_LIMIT_MAX, 60),
    authSecret: source.AUTH_SECRET ?? 'dev-only-change-me',
    appUrl: source.APP_URL ?? source.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    sessionTtlDays: toNumber(source.SESSION_TTL_DAYS, 30),
    passwordResetTtlMinutes: toNumber(source.PASSWORD_RESET_TTL_MINUTES, 60),
  };
};

export const getWebConfig = (env?: EnvMap): WebConfig => {
  const source = readEnv(env);
  return {
    apiUrl: source.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
    nodeEnv: source.NODE_ENV ?? 'development',
    siteUrl: source.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  };
};

export const getBillingConfig = (env?: EnvMap): BillingConfig => {
  const source = readEnv(env);
  const nodeEnv = source.NODE_ENV ?? 'development';
  const explicit = source.BILLING_PROVIDER?.trim().toLowerCase();
  const billingProvider: BillingConfig['billingProvider'] =
    explicit === 'mock' || (explicit !== 'razorpay' && nodeEnv === 'test') ? 'mock' : 'razorpay';

  return {
    razorpayKeyId: source.RAZORPAY_KEY_ID ?? '',
    razorpayKeySecret: source.RAZORPAY_KEY_SECRET ?? '',
    razorpayWebhookSecret: source.RAZORPAY_WEBHOOK_SECRET ?? '',
    razorpayProPlanId: source.RAZORPAY_PRO_PLAN_ID ?? '',
    billingProvider,
  };
};

export const currentUsagePeriod = (date = new Date()): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

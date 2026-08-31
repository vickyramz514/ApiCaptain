/** Shared API contracts for ApiCaptain apps and packages. */

export type TypeScriptOutputKind = 'interface' | 'type';

export interface GenerateTypeScriptOptions {
  rootName: string;
  outputType: TypeScriptOutputKind;
  optionalProperties: boolean;
  useSemicolon: boolean;
  exportTypes: boolean;
}

export interface GenerateTypeScriptRequest {
  json: unknown;
  rootName?: string;
  outputType?: TypeScriptOutputKind;
  optionalProperties?: boolean;
  useSemicolon?: boolean;
  exportTypes?: boolean;
}

export interface GenerateTypeScriptData {
  code: string;
}

export type GenerateTypeScriptResponse = ApiSuccessResponse<GenerateTypeScriptData>;

/** HTTP + multi-language API generation */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Phase 2 + Phase 3 frameworks */
export type ApiFramework =
  | 'react-native'
  | 'flutter'
  | 'swiftui'
  | 'android'
  | 'python';

/** HTTP client libraries (React Native Phase 2) */
export type HttpLibrary = 'axios' | 'fetch';

export type GeneratedLanguage =
  | 'typescript'
  | 'dart'
  | 'swift'
  | 'kotlin'
  | 'python';

export interface GenerateApiCodeRequest {
  method: HttpMethod;
  endpoint: string;
  requestJson?: unknown | null;
  responseJson: unknown;
  framework: ApiFramework;
  /** Required for react-native; ignored for other frameworks */
  library?: HttpLibrary;
  rootName?: string;
}

export interface GeneratedFile {
  filename: string;
  content: string;
  language: GeneratedLanguage;
}

export interface GenerateApiCodeData {
  files: GeneratedFile[];
  meta: {
    baseName: string;
    functionName: string;
    requestTypeName: string | null;
    responseTypeName: string;
    method: HttpMethod;
    endpoint: string;
    framework: ApiFramework;
    library: HttpLibrary | null;
    rootName: string;
  };
}

export type GenerateApiCodeResponse = ApiSuccessResponse<GenerateApiCodeData>;

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface HealthData {
  message: string;
}

export type HealthApiResponse = ApiSuccessResponse<HealthData> & {
  message: string;
};

/** @deprecated Prefer GenerateTypeScriptRequest — kept for scaffold compatibility */
export type GeneratorTarget = 'typescript' | 'zod' | 'json-schema';

export interface JsonSchemaDocument {
  name: string;
  schema: Record<string, unknown>;
}

export interface GenerateRequest {
  document: JsonSchemaDocument;
  target: GeneratorTarget;
}

export interface GenerateResult {
  target: GeneratorTarget;
  filename: string;
  content: string;
}

export type HealthStatus = 'ok' | 'degraded' | 'error';

export interface HealthResponse {
  status: HealthStatus;
  service: string;
  timestamp: string;
  version: string;
}

/** Phase 4 — OpenAPI / Swagger generation */
export type GenerationSourceType = 'json' | 'api' | 'openapi';

export type OpenApiLibrary =
  | 'axios'
  | 'fetch'
  | 'dio'
  | 'urlsession'
  | 'retrofit'
  | 'httpx';

export interface OpenApiParseRequest {
  content: string;
  format?: 'json' | 'yaml' | 'auto';
}

export interface OpenApiEndpointSummary {
  id: string;
  operationId: string;
  method: string;
  path: string;
  summary?: string;
  description?: string;
  tags: string[];
  parameters: Array<{
    name: string;
    in: string;
    required: boolean;
    description?: string;
  }>;
  hasRequestBody: boolean;
  successStatus?: string;
}

export interface OpenApiParseData {
  title: string;
  version: string;
  description?: string;
  baseUrl: string;
  servers: string[];
  openapiVersion: string;
  documentFormat: 'json' | 'yaml';
  authentication: Array<{
    name: string;
    type: string;
    scheme?: string;
  }>;
  tags: string[];
  endpointCount: number;
  endpoints: OpenApiEndpointSummary[];
  /** Full normalized specification for generate (opaque to UI beyond explorer needs) */
  specification: unknown;
}

export type OpenApiParseResponse = ApiSuccessResponse<OpenApiParseData>;

export interface OpenApiImportUrlRequest {
  url: string;
}

export interface OpenApiGenerateRequest {
  specification: unknown;
  endpointIds?: string[] | 'all';
  framework: ApiFramework;
  library?: OpenApiLibrary | HttpLibrary;
  baseUrlOverride?: string;
}

export interface OpenApiGenerateData {
  files: GeneratedFile[];
  meta: {
    framework: ApiFramework;
    library: OpenApiLibrary | HttpLibrary | null;
    endpointCount: number;
    title: string;
    baseUrl: string;
  };
}

export type OpenApiGenerateResponse = ApiSuccessResponse<OpenApiGenerateData>;


/** Phase 5 — SaaS auth, projects, usage */
export type UserPlan = 'FREE' | 'PRO';

export type AuthProvider = 'email' | 'google';

export type ProjectSourceType = 'JSON' | 'API' | 'OPENAPI';

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  plan: UserPlan;
  authProvider: AuthProvider;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AuthTokenData {
  token: string;
  user: PublicUser;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleLoginRequest {
  credential: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface MeData {
  user: PublicUser;
  usage: {
    period: string;
    generationCount: number;
    generationLimit: number | null;
    projectCount: number;
    projectLimit: number | null;
  };
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  sourceType: ProjectSourceType;
  framework: string | null;
  library: string | null;
  openApiVersion: string | null;
  createdAt: string;
  updatedAt: string;
  lastGeneratedAt: string | null;
}

export interface ProjectDetail extends ProjectSummary {
  sourceContent: string | null;
  sourceMeta: unknown;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  sourceType: ProjectSourceType;
  sourceContent?: string;
  sourceMeta?: unknown;
  openApiVersion?: string;
  framework?: string;
  library?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string | null;
  sourceContent?: string | null;
  sourceMeta?: unknown;
  openApiVersion?: string | null;
  framework?: string | null;
  library?: string | null;
}

export interface GenerationHistoryItem {
  id: string;
  sourceType: string;
  framework: string | null;
  language: string | null;
  library: string | null;
  endpointCount: number | null;
  status: 'SUCCESS' | 'FAILED';
  durationMs: number | null;
  createdAt: string;
}

export interface DashboardData {
  user: PublicUser;
  usage: MeData['usage'];
  projectCount: number;
  recentGenerations: GenerationHistoryItem[];
  recentProjects: ProjectSummary[];
}

export interface PricingData {
  plans: Array<{
    id: UserPlan;
    name: string;
    priceMonthlyInr: number;
    currency: string;
    ctaLabel: string;
    ctaMode: string;
    highlights: string[];
    limits: {
      generationsPerMonth: number | null;
      projects: number | null;
      maxOpenApiBytes: number;
      maxEndpoints: number;
    };
  }>;
}

export interface DeleteAccountRequest {
  confirmation: 'DELETE';
  /** Required for email/password accounts; omitted for Google-only accounts */
  password?: string;
}

/** Phase 6 — Billing */
export type SubscriptionStatus =
  | 'ACTIVE'
  | 'TRIALING'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'INACTIVE';

export type BillingProvider = 'NONE' | 'RAZORPAY' | 'STRIPE';

export type PaymentStatus = 'CREATED' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';

export interface BillingStatusData {
  plan: UserPlan;
  status: SubscriptionStatus;
  provider: BillingProvider;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  priceMonthlyInr: number;
  currency: 'INR';
  amountPaise: number;
  paymentMethod: string | null;
}

export interface SubscribeData {
  subscriptionId: string;
  provider: 'razorpay';
  keyId: string;
  plan: 'PRO';
  amountPaise: number;
  currency: 'INR';
  name: string;
  description: string;
}

export interface VerifyPaymentRequest {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

export interface CancelSubscriptionRequest {
  immediately?: boolean;
}

export interface PaymentHistoryItem {
  id: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
  invoiceUrl: string | null;
}

export interface PaymentHistoryData {
  payments: PaymentHistoryItem[];
}

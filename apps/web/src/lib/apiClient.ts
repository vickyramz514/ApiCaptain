import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  AuthTokenData,
  BillingStatusData,
  CreateProjectRequest,
  DashboardData,
  DeleteAccountRequest,
  ForgotPasswordRequest,
  GenerateApiCodeData,
  GenerateApiCodeRequest,
  GenerateTypeScriptData,
  GenerateTypeScriptRequest,
  LoginRequest,
  MeData,
  OpenApiGenerateData,
  OpenApiGenerateRequest,
  OpenApiParseData,
  OpenApiParseRequest,
  OpenApiImportUrlRequest,
  PaymentHistoryData,
  PricingData,
  ProjectDetail,
  RegisterRequest,
  ResetPasswordRequest,
  SubscribeData,
  UpdateProjectRequest,
  VerifyPaymentRequest,
} from '@apicaptain/types';

const TOKEN_KEY = 'apicaptain_token';
const DRAFT_KEY = 'apicaptain_save_draft';

const apiBaseUrl = () =>
  (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
};

export const setStoredToken = (token: string | null): void => {
  if (typeof window === 'undefined') return;
  if (!token) window.localStorage.removeItem(TOKEN_KEY);
  else window.localStorage.setItem(TOKEN_KEY, token);
};

export const setSaveDraft = (draft: unknown): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
};

export const consumeSaveDraft = <T>(): T | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  window.localStorage.removeItem(DRAFT_KEY);
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const authHeaders = (): HeadersInit => {
  const token = getStoredToken();
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
};

const parseApiResponse = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json()) as ApiSuccessResponse<T> | ApiErrorResponse;

  if (!response.ok || !payload.success) {
    const errorPayload = payload as ApiErrorResponse;
    throw new ApiClientError(
      errorPayload.error?.code ?? 'REQUEST_FAILED',
      errorPayload.error?.message ?? 'Request failed',
      response.status,
      errorPayload.error?.details,
    );
  }

  return payload.data;
};

const post = async <T>(path: string, body?: unknown, auth = false): Promise<T> => {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method: 'POST',
    headers: auth ? authHeaders() : { 'Content-Type': 'application/json', ...authHeaders() },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'include',
  });
  return parseApiResponse<T>(response);
};

const get = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    headers: authHeaders(),
    credentials: 'include',
  });
  return parseApiResponse<T>(response);
};

export const generateTypeScript = async (
  request: GenerateTypeScriptRequest,
): Promise<GenerateTypeScriptData> =>
  post('/api/v1/generate/typescript', request, true);

export const generateApiCode = async (
  request: GenerateApiCodeRequest,
): Promise<GenerateApiCodeData> => post('/api/v1/generate/api-code', request, true);

export const parseOpenApi = async (request: OpenApiParseRequest): Promise<OpenApiParseData> =>
  post('/api/v1/openapi/parse', request);

export const importOpenApiUrl = async (
  request: OpenApiImportUrlRequest,
): Promise<OpenApiParseData> => post('/api/v1/openapi/import-url', request);

export const generateOpenApiClient = async (
  request: OpenApiGenerateRequest,
): Promise<OpenApiGenerateData> => post('/api/v1/openapi/generate', request, true);

export const register = (request: RegisterRequest): Promise<AuthTokenData> =>
  post('/api/v1/auth/register', request);

export const login = (request: LoginRequest): Promise<AuthTokenData> =>
  post('/api/v1/auth/login', request);

export const logout = (): Promise<{ ok: true }> => post('/api/v1/auth/logout', {}, true);

export const fetchMe = (): Promise<MeData> => get('/api/v1/auth/me');

export const forgotPassword = (request: ForgotPasswordRequest): Promise<{ ok: true }> =>
  post('/api/v1/auth/forgot-password', request);

export const resetPassword = (request: ResetPasswordRequest): Promise<{ ok: true }> =>
  post('/api/v1/auth/reset-password', request);

export const fetchDashboard = (): Promise<DashboardData> => get('/api/v1/dashboard');

export const fetchPricing = (): Promise<PricingData> => get('/api/v1/auth/pricing');

export const listProjects = (): Promise<{ projects: import('@apicaptain/types').ProjectSummary[] }> =>
  get('/api/v1/projects');

export const getProject = (id: string): Promise<ProjectDetail> => get(`/api/v1/projects/${id}`);

export const createProject = (request: CreateProjectRequest): Promise<ProjectDetail> =>
  post('/api/v1/projects', request, true);

export const updateProject = async (
  id: string,
  request: UpdateProjectRequest,
): Promise<ProjectDetail> => {
  const response = await fetch(`${apiBaseUrl()}/api/v1/projects/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(request),
  });
  return parseApiResponse<ProjectDetail>(response);
};

export const deleteProject = async (id: string): Promise<{ ok: true }> => {
  const response = await fetch(`${apiBaseUrl()}/api/v1/projects/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
    credentials: 'include',
  });
  return parseApiResponse<{ ok: true }>(response);
};

export const fetchProjectHistory = (
  id: string,
): Promise<{ generations: Array<Record<string, unknown>> }> =>
  get(`/api/v1/projects/${id}/history`);

export const generateProject = (id: string): Promise<{ files: unknown; meta: unknown }> =>
  post(`/api/v1/projects/${id}/generate`, {}, true);

export const deleteAccount = (request: DeleteAccountRequest): Promise<{ ok: true }> => {
  return fetch(`${apiBaseUrl()}/api/v1/account`, {
    method: 'DELETE',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(request),
  }).then((response) => parseApiResponse<{ ok: true }>(response));
};

export const fetchBilling = (): Promise<BillingStatusData> => get('/api/v1/billing');

export const fetchBillingPayments = (): Promise<PaymentHistoryData> => get('/api/v1/billing/payments');

export const createSubscriptionCheckout = (): Promise<SubscribeData> =>
  post('/api/v1/billing/subscribe', {}, true);

export const verifySubscriptionPayment = (request: VerifyPaymentRequest): Promise<BillingStatusData> =>
  post('/api/v1/billing/verify', request, true);

export const cancelSubscription = (immediately = false): Promise<BillingStatusData> =>
  post('/api/v1/billing/cancel', { immediately }, true);

export const reactivateSubscription = (): Promise<BillingStatusData> =>
  post('/api/v1/billing/reactivate', {}, true);

export const EXAMPLE_JSON = `{
  "id": 123,
  "name": "John",
  "email": "john@example.com",
  "isActive": true,
  "address": {
    "city": "Chennai",
    "country": "India"
  },
  "tags": ["developer", "react-native"]
}`;

export const EXAMPLE_API_REQUEST = `{
  "email": "john@test.com",
  "password": "123456"
}`;

export const EXAMPLE_API_RESPONSE = `{
  "token": "abc123",
  "user": {
    "id": 1,
    "name": "John",
    "email": "john@test.com"
  }
}`;

export const EXAMPLE_OPENAPI_YAML = `openapi: 3.0.3
info:
  title: Example Shop API
  version: 1.0.0
servers:
  - url: https://api.example.com/v1
paths:
  /auth/login:
    post:
      tags: [Auth]
      operationId: login
      summary: Login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email: { type: string }
                password: { type: string }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  token: { type: string }
  /users:
    get:
      tags: [Users]
      operationId: getUsers
      summary: List users
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id: { type: integer }
                    name: { type: string }
  /users/{id}:
    get:
      tags: [Users]
      operationId: getUserById
      summary: Get user
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: integer }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  id: { type: integer }
                  name: { type: string }
`;

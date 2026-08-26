/** Shared API contracts for ApiCaptain apps and packages. */

export type HealthStatus = 'ok' | 'degraded' | 'error';

export interface HealthResponse {
  status: HealthStatus;
  service: string;
  timestamp: string;
  version: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface JsonSchemaDocument {
  name: string;
  schema: Record<string, unknown>;
}

export type GeneratorTarget = 'typescript' | 'zod' | 'json-schema';

export interface GenerateRequest {
  document: JsonSchemaDocument;
  target: GeneratorTarget;
}

export interface GenerateResult {
  target: GeneratorTarget;
  filename: string;
  content: string;
}

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

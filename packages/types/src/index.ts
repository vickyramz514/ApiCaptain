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

/** Phase 2 — React Native API code generation */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiFramework = 'react-native';

export type HttpLibrary = 'axios' | 'fetch';

export interface GenerateApiCodeRequest {
  method: HttpMethod;
  endpoint: string;
  requestJson?: unknown | null;
  responseJson: unknown;
  framework: ApiFramework;
  library: HttpLibrary;
}

export interface GeneratedFile {
  filename: string;
  content: string;
  language: 'typescript';
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
    library: HttpLibrary;
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

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

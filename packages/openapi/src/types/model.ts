/** Normalized, framework-independent OpenAPI representation. */

export type HttpMethodLower =
  | 'get'
  | 'post'
  | 'put'
  | 'patch'
  | 'delete'
  | 'head'
  | 'options'
  | 'trace';

export type NormalizedHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type ParameterLocation = 'path' | 'query' | 'header' | 'cookie';

export type SchemaType =
  | 'string'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null'
  | 'unknown';

export interface NormalizedSchema {
  name?: string;
  type: SchemaType;
  format?: string;
  description?: string;
  required?: string[];
  properties?: Record<string, NormalizedSchema>;
  items?: NormalizedSchema;
  enum?: Array<string | number | boolean>;
  nullable?: boolean;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  additionalProperties?: boolean | NormalizedSchema;
  /** Circular / deferred reference name */
  refName?: string;
  circular?: boolean;
}

export interface NormalizedParameter {
  name: string;
  in: ParameterLocation;
  required: boolean;
  description?: string;
  schema: NormalizedSchema;
}

export interface NormalizedRequestBody {
  required: boolean;
  description?: string;
  contentType: string;
  schema: NormalizedSchema | null;
}

export interface NormalizedResponse {
  statusCode: string;
  description?: string;
  contentType?: string;
  schema: NormalizedSchema | null;
}

export type AuthSchemeType = 'apiKey' | 'http' | 'oauth2' | 'openIdConnect' | 'unknown';

export interface NormalizedAuthScheme {
  name: string;
  type: AuthSchemeType;
  scheme?: string;
  bearerFormat?: string;
  in?: ParameterLocation;
  paramName?: string;
  description?: string;
}

export interface NormalizedEndpoint {
  /** Stable id: METHOD:path or operationId when unique */
  id: string;
  operationId: string;
  method: NormalizedHttpMethod;
  path: string;
  summary?: string;
  description?: string;
  tags: string[];
  parameters: NormalizedParameter[];
  requestBody: NormalizedRequestBody | null;
  responses: NormalizedResponse[];
  /** Primary success response (2xx) */
  successResponse: NormalizedResponse | null;
}

export interface ApiSpecification {
  title: string;
  version: string;
  description?: string;
  baseUrl: string;
  servers: string[];
  openapiVersion: string;
  documentFormat: 'json' | 'yaml';
  authentication: NormalizedAuthScheme[];
  endpoints: NormalizedEndpoint[];
  /** Named component schemas after normalization */
  schemas: Record<string, NormalizedSchema>;
  tags: string[];
  endpointCount: number;
}

export interface ParseOpenApiOptions {
  format?: 'json' | 'yaml' | 'auto';
  maxBytes?: number;
}

export interface ParseOpenApiResult {
  specification: ApiSpecification;
}

export type OpenApiErrorCode =
  | 'INVALID_OPENAPI'
  | 'UNSUPPORTED_OPENAPI_VERSION'
  | 'INVALID_YAML'
  | 'INVALID_JSON'
  | 'UNRESOLVED_REFERENCE'
  | 'CIRCULAR_REFERENCE'
  | 'MISSING_SCHEMA'
  | 'INVALID_OPERATION'
  | 'DOCUMENT_TOO_LARGE'
  | 'INVALID_URL'
  | 'URL_FETCH_FAILED'
  | 'SSRF_BLOCKED';

export class OpenApiError extends Error {
  readonly code: OpenApiErrorCode;
  readonly details?: unknown;

  constructor(code: OpenApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'OpenApiError';
    this.code = code;
    this.details = details;
  }
}

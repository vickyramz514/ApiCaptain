export const OPENAPI_LIMITS = {
  maxDocumentBytes: 2 * 1024 * 1024,
  maxUrlResponseBytes: 2 * 1024 * 1024,
  maxEndpoints: 2_000,
  maxSchemaDepth: 64,
  maxPropertiesPerObject: 500,
  urlFetchTimeoutMs: 10_000,
  maxRedirects: 3,
} as const;

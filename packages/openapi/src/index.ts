import { OPENAPI_LIMITS } from './limits.js';
import { parseOpenApiDocument } from './parser/parse.js';
import { resolveLocalRefs } from './resolver/resolveRefs.js';
import { normalizeOpenApiDocument } from './normalizer/normalize.js';
import { validateNormalizedSpecification } from './validator/validate.js';
import { OpenApiError } from './types/errors.js';
import type { ApiSpecification, ParseOpenApiOptions, ParseOpenApiResult } from './types/model.js';

export type {
  ApiSpecification,
  NormalizedEndpoint,
  NormalizedSchema,
  NormalizedParameter,
  NormalizedRequestBody,
  NormalizedResponse,
  NormalizedAuthScheme,
  ParseOpenApiOptions,
  ParseOpenApiResult,
} from './types/model.js';

export { OpenApiError } from './types/errors.js';
export type { OpenApiErrorCode } from './types/errors.js';
export { OPENAPI_LIMITS } from './limits.js';
export { deriveOperationId } from './normalizer/normalize.js';
export { isSafePublicUrl, assertSafePublicUrl } from './security/ssrf.js';
export type { FetchUrlOptions } from './security/fetchUrl.js';
export { fetchOpenApiFromUrl } from './security/fetchUrl.js';

/**
 * Parse + resolve + normalize an OpenAPI/Swagger document once.
 */
export const parseAndNormalizeOpenApi = (
  content: string,
  options: ParseOpenApiOptions = {},
): ParseOpenApiResult => {
  const parsed = parseOpenApiDocument(content, options);
  const { document, circularRefs } = resolveLocalRefs(parsed.document);

  // Circular refs are handled safely; expose as soft signal only when nothing else works
  void circularRefs;

  const normalized = normalizeOpenApiDocument({
    document,
    version: parsed.version,
    format: parsed.format,
  });

  const specification: ApiSpecification = {
    ...normalized,
    endpointCount: normalized.endpoints.length,
  };

  validateNormalizedSpecification(specification);

  if (specification.endpointCount === 0) {
    throw new OpenApiError('INVALID_OPENAPI', 'No operations found in the specification');
  }

  if (Buffer.byteLength(content, 'utf8') > (options.maxBytes ?? OPENAPI_LIMITS.maxDocumentBytes)) {
    throw new OpenApiError('DOCUMENT_TOO_LARGE', 'Document exceeds size limit');
  }

  return { specification };
};

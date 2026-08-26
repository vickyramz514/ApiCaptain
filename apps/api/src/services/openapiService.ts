import type {
  OpenApiEndpointSummary,
  OpenApiGenerateData,
  OpenApiGenerateRequest,
  OpenApiImportUrlRequest,
  OpenApiParseData,
  OpenApiParseRequest,
} from '@apicaptain/types';
import {
  OpenApiError,
  fetchOpenApiFromUrl,
  parseAndNormalizeOpenApi,
  type ApiSpecification,
} from '@apicaptain/openapi';
import { generateFromOpenApi } from '@apicaptain/generators';
import { AppError } from '../utils/errors.js';

const mapOpenApiError = (error: unknown): never => {
  if (error instanceof OpenApiError) {
    const status =
      error.code === 'DOCUMENT_TOO_LARGE'
        ? 413
        : error.code === 'SSRF_BLOCKED' || error.code === 'INVALID_URL'
          ? 400
          : error.code === 'URL_FETCH_FAILED'
            ? 502
            : 400;
    throw new AppError(error.code, error.message, status, error.details);
  }
  throw error;
};

const toParseData = (specification: ApiSpecification): OpenApiParseData => {
  const endpoints: OpenApiEndpointSummary[] = specification.endpoints.map((endpoint) => ({
    id: endpoint.id,
    operationId: endpoint.operationId,
    method: endpoint.method,
    path: endpoint.path,
    summary: endpoint.summary,
    description: endpoint.description,
    tags: endpoint.tags,
    parameters: endpoint.parameters.map((parameter) => ({
      name: parameter.name,
      in: parameter.in,
      required: parameter.required,
      description: parameter.description,
    })),
    hasRequestBody: Boolean(endpoint.requestBody?.schema),
    successStatus: endpoint.successResponse?.statusCode,
  }));

  return {
    title: specification.title,
    version: specification.version,
    description: specification.description,
    baseUrl: specification.baseUrl,
    servers: specification.servers,
    openapiVersion: specification.openapiVersion,
    documentFormat: specification.documentFormat,
    authentication: specification.authentication.map((auth) => ({
      name: auth.name,
      type: auth.type,
      scheme: auth.scheme,
    })),
    tags: specification.tags,
    endpointCount: specification.endpointCount,
    endpoints,
    specification,
  };
};

const isApiSpecification = (value: unknown): value is ApiSpecification => {
  if (!value || typeof value !== 'object') return false;
  const spec = value as Record<string, unknown>;
  return (
    typeof spec.title === 'string' &&
    typeof spec.version === 'string' &&
    Array.isArray(spec.endpoints)
  );
};

export const parseOpenApiService = (request: OpenApiParseRequest): OpenApiParseData => {
  try {
    const { specification } = parseAndNormalizeOpenApi(request.content, {
      format: request.format ?? 'auto',
    });
    return toParseData(specification);
  } catch (error) {
    return mapOpenApiError(error);
  }
};

export const importOpenApiUrlService = async (
  request: OpenApiImportUrlRequest,
): Promise<OpenApiParseData> => {
  try {
    const fetched = await fetchOpenApiFromUrl(request.url);
    const formatHint =
      fetched.contentType?.includes('json')
        ? 'json'
        : fetched.contentType?.includes('yaml') || fetched.contentType?.includes('yml')
          ? 'yaml'
          : 'auto';
    const { specification } = parseAndNormalizeOpenApi(fetched.content, {
      format: formatHint,
    });
    return toParseData(specification);
  } catch (error) {
    return mapOpenApiError(error);
  }
};

export const generateOpenApiService = (
  request: OpenApiGenerateRequest,
): OpenApiGenerateData => {
  try {
    if (!isApiSpecification(request.specification)) {
      throw new AppError('INVALID_OPENAPI', 'specification must be a normalized ApiSpecification');
    }

    return generateFromOpenApi({
      specification: request.specification,
      endpointIds: request.endpointIds ?? 'all',
      framework: request.framework,
      library: request.library,
      baseUrlOverride: request.baseUrlOverride,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error) {
      throw new AppError('INVALID_OPERATION', error.message);
    }
    throw error;
  }
};

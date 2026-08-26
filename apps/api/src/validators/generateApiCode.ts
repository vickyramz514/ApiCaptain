import type {
  ApiFramework,
  GenerateApiCodeRequest,
  HttpLibrary,
  HttpMethod,
} from '@apicaptain/types';
import { AppError } from '../utils/errors.js';

const HTTP_METHODS = new Set<HttpMethod>(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const FRAMEWORKS = new Set<ApiFramework>(['react-native']);
const LIBRARIES = new Set<HttpLibrary>(['axios', 'fetch']);
const METHODS_REQUIRING_BODY = new Set<HttpMethod>(['POST', 'PUT', 'PATCH']);

export const validateGenerateApiCodeRequest = (body: unknown): GenerateApiCodeRequest => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('INVALID_REQUEST', 'Request body must be a JSON object');
  }

  const payload = body as Record<string, unknown>;

  if (typeof payload.method !== 'string' || !HTTP_METHODS.has(payload.method as HttpMethod)) {
    throw new AppError('INVALID_METHOD', 'method must be one of GET, POST, PUT, PATCH, DELETE');
  }

  const method = payload.method as HttpMethod;

  if (typeof payload.endpoint !== 'string' || !payload.endpoint.trim()) {
    throw new AppError('INVALID_ENDPOINT', 'endpoint must be a non-empty string');
  }

  if (!payload.endpoint.trim().startsWith('/')) {
    throw new AppError('INVALID_ENDPOINT', 'endpoint must start with "/"');
  }

  if (!('responseJson' in payload) || payload.responseJson === undefined) {
    throw new AppError('MISSING_FIELD', 'Field "responseJson" is required');
  }

  if (
    typeof payload.framework !== 'string' ||
    !FRAMEWORKS.has(payload.framework as ApiFramework)
  ) {
    throw new AppError('INVALID_FRAMEWORK', 'framework must be "react-native"');
  }

  if (typeof payload.library !== 'string' || !LIBRARIES.has(payload.library as HttpLibrary)) {
    throw new AppError('INVALID_LIBRARY', 'library must be "axios" or "fetch"');
  }

  if (METHODS_REQUIRING_BODY.has(method)) {
    if (!('requestJson' in payload) || payload.requestJson === undefined || payload.requestJson === null) {
      throw new AppError(
        'MISSING_REQUEST_BODY',
        `requestJson is required for ${method} requests`,
      );
    }
  }

  return {
    method,
    endpoint: payload.endpoint.trim(),
    requestJson: payload.requestJson ?? null,
    responseJson: payload.responseJson,
    framework: payload.framework as ApiFramework,
    library: payload.library as HttpLibrary,
  };
};

import type { OpenApiGenerateRequest, OpenApiImportUrlRequest, OpenApiParseRequest } from '@apicaptain/types';
import { AppError } from '../utils/errors.js';

const FRAMEWORKS = new Set(['react-native', 'flutter', 'swiftui', 'android', 'python']);
const LIBRARIES = new Set(['axios', 'fetch', 'dio', 'urlsession', 'retrofit', 'httpx']);

export const validateOpenApiParseRequest = (body: unknown): OpenApiParseRequest => {
  if (!body || typeof body !== 'object') {
    throw new AppError('INVALID_REQUEST', 'Request body must be an object');
  }
  const payload = body as Record<string, unknown>;
  if (typeof payload.content !== 'string' || !payload.content.trim()) {
    throw new AppError('INVALID_REQUEST', 'content is required');
  }
  if (Buffer.byteLength(payload.content, 'utf8') > 2 * 1024 * 1024) {
    throw new AppError('DOCUMENT_TOO_LARGE', 'content exceeds 2MB');
  }
  const format = payload.format;
  if (
    format !== undefined &&
    format !== 'json' &&
    format !== 'yaml' &&
    format !== 'auto'
  ) {
    throw new AppError('INVALID_REQUEST', 'format must be json, yaml, or auto');
  }
  return {
    content: payload.content,
    format: format as OpenApiParseRequest['format'],
  };
};

export const validateOpenApiImportUrlRequest = (body: unknown): OpenApiImportUrlRequest => {
  if (!body || typeof body !== 'object') {
    throw new AppError('INVALID_REQUEST', 'Request body must be an object');
  }
  const payload = body as Record<string, unknown>;
  if (typeof payload.url !== 'string' || !payload.url.trim()) {
    throw new AppError('INVALID_REQUEST', 'url is required');
  }
  return { url: payload.url.trim() };
};

export const validateOpenApiGenerateRequest = (body: unknown): OpenApiGenerateRequest => {
  if (!body || typeof body !== 'object') {
    throw new AppError('INVALID_REQUEST', 'Request body must be an object');
  }
  const payload = body as Record<string, unknown>;
  if (!payload.specification || typeof payload.specification !== 'object') {
    throw new AppError('INVALID_REQUEST', 'specification is required');
  }
  if (typeof payload.framework !== 'string' || !FRAMEWORKS.has(payload.framework)) {
    throw new AppError('INVALID_REQUEST', 'framework is invalid');
  }
  if (payload.library !== undefined && (typeof payload.library !== 'string' || !LIBRARIES.has(payload.library))) {
    throw new AppError('INVALID_REQUEST', 'library is invalid');
  }
  if (payload.framework === 'react-native' && !payload.library) {
    throw new AppError('INVALID_REQUEST', 'library is required for react-native');
  }
  if (
    payload.endpointIds !== undefined &&
    payload.endpointIds !== 'all' &&
    !Array.isArray(payload.endpointIds)
  ) {
    throw new AppError('INVALID_REQUEST', 'endpointIds must be "all" or an array of ids');
  }
  if (Array.isArray(payload.endpointIds) && !payload.endpointIds.every((id) => typeof id === 'string')) {
    throw new AppError('INVALID_REQUEST', 'endpointIds must be strings');
  }

  return {
    specification: payload.specification,
    endpointIds: payload.endpointIds as OpenApiGenerateRequest['endpointIds'],
    framework: payload.framework as OpenApiGenerateRequest['framework'],
    library: payload.library as OpenApiGenerateRequest['library'],
    baseUrlOverride:
      typeof payload.baseUrlOverride === 'string' ? payload.baseUrlOverride : undefined,
  };
};

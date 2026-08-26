import { parse as parseYaml } from 'yaml';
import { OPENAPI_LIMITS } from '../limits.js';
import { OpenApiError } from '../types/errors.js';
import type { ParseOpenApiOptions } from '../types/model.js';
import {
  assertSupportedVersion,
  detectDocumentFormat,
  detectOpenApiVersion,
  parseDocumentText,
} from './detect.js';

export interface ParsedOpenApiDocument {
  document: Record<string, unknown>;
  format: 'json' | 'yaml';
  version: string;
}

export const parseOpenApiDocument = (
  content: string,
  options: ParseOpenApiOptions = {},
): ParsedOpenApiDocument => {
  const maxBytes = options.maxBytes ?? OPENAPI_LIMITS.maxDocumentBytes;
  const byteLength = Buffer.byteLength(content, 'utf8');
  if (byteLength > maxBytes) {
    throw new OpenApiError('DOCUMENT_TOO_LARGE', `Document exceeds ${maxBytes} bytes`, {
      byteLength,
      maxBytes,
    });
  }

  const format = detectDocumentFormat(content, options.format ?? 'auto');
  const document = parseDocumentText(content, format, parseYaml);
  const version = detectOpenApiVersion(document);
  assertSupportedVersion(version);

  return { document, format, version };
};

import { OpenApiError } from '../types/errors.js';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const detectDocumentFormat = (
  content: string,
  explicit?: 'json' | 'yaml' | 'auto',
): 'json' | 'yaml' => {
  if (explicit === 'json' || explicit === 'yaml') return explicit;
  const trimmed = content.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  return 'yaml';
};

export const parseDocumentText = (
  content: string,
  format: 'json' | 'yaml',
  parseYaml: (text: string) => unknown,
): Record<string, unknown> => {
  let parsed: unknown;
  try {
    parsed = format === 'json' ? JSON.parse(content) : parseYaml(content);
  } catch (error) {
    throw new OpenApiError(
      format === 'json' ? 'INVALID_JSON' : 'INVALID_YAML',
      format === 'json' ? 'Invalid JSON document' : 'Invalid YAML document',
      { message: error instanceof Error ? error.message : String(error) },
    );
  }

  if (!isPlainObject(parsed)) {
    throw new OpenApiError('INVALID_OPENAPI', 'OpenAPI document must be an object');
  }

  return parsed;
};

export const detectOpenApiVersion = (document: Record<string, unknown>): string => {
  if (typeof document.openapi === 'string') {
    return document.openapi;
  }
  if (typeof document.swagger === 'string') {
    return document.swagger;
  }
  throw new OpenApiError(
    'UNSUPPORTED_OPENAPI_VERSION',
    'Document must include openapi (3.x) or swagger (2.0)',
  );
};

export const assertSupportedVersion = (version: string): void => {
  if (version.startsWith('3.0') || version.startsWith('3.1') || version === '2.0') {
    return;
  }
  throw new OpenApiError(
    'UNSUPPORTED_OPENAPI_VERSION',
    `Unsupported OpenAPI/Swagger version: ${version}`,
    { version },
  );
};

import { OPENAPI_LIMITS } from '../limits.js';
import { OpenApiError } from '../types/errors.js';
import type {
  NormalizedAuthScheme,
  NormalizedEndpoint,
  NormalizedHttpMethod,
  NormalizedParameter,
  NormalizedRequestBody,
  NormalizedResponse,
  NormalizedSchema,
  ParameterLocation,
  SchemaType,
} from '../types/model.js';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const HTTP_METHODS = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
]);

const toMethod = (method: string): NormalizedHttpMethod | null => {
  const upper = method.toUpperCase();
  if (
    upper === 'GET' ||
    upper === 'POST' ||
    upper === 'PUT' ||
    upper === 'PATCH' ||
    upper === 'DELETE' ||
    upper === 'HEAD' ||
    upper === 'OPTIONS'
  ) {
    return upper;
  }
  return null;
};

const sanitizeIdentifier = (value: string, fallback: string): string => {
  const cleaned = value
    .replace(/\{([^}]+)\}/g, 'By$1')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  const result = cleaned || fallback;
  return /^[A-Za-z_]/.test(result) ? result : `Op${result}`;
};

export const deriveOperationId = (method: string, path: string, explicit?: string): string => {
  if (explicit && explicit.trim()) {
    const raw = explicit.trim();
    const camel = raw.charAt(0).toLowerCase() + raw.slice(1).replace(/[^a-zA-Z0-9_]/g, '');
    if (camel) return camel;
  }

  const segments = path
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      if (segment.startsWith('{') && segment.endsWith('}')) {
        const name = segment.slice(1, -1);
        return `By${sanitizeIdentifier(name, 'Id')}`;
      }
      return sanitizeIdentifier(segment, 'Part');
    });

  const base = segments.join('') || 'Endpoint';
  const prefix = method.toLowerCase();
  const combined = `${prefix}${base}`;
  return combined.charAt(0).toLowerCase() + combined.slice(1);
};

const mapSchemaType = (raw: unknown): SchemaType => {
  if (Array.isArray(raw)) {
    const nonNull = raw.find((item) => item !== 'null');
    return mapSchemaType(nonNull ?? 'unknown');
  }
  switch (raw) {
    case 'string':
    case 'integer':
    case 'number':
    case 'boolean':
    case 'object':
    case 'array':
    case 'null':
      return raw;
    default:
      return 'unknown';
  }
};

export const normalizeSchema = (
  schema: unknown,
  preferredName: string,
  depth = 0,
): NormalizedSchema => {
  if (depth > OPENAPI_LIMITS.maxSchemaDepth) {
    return { type: 'unknown', description: 'Schema depth limit exceeded' };
  }

  if (!isPlainObject(schema)) {
    return { type: 'unknown' };
  }

  if (schema['x-apicaptain-circular'] === true) {
    const refName =
      typeof schema['x-apicaptain-ref-name'] === 'string'
        ? schema['x-apicaptain-ref-name']
        : preferredName;
    return {
      type: 'object',
      name: refName,
      refName,
      circular: true,
      description: 'Circular reference',
    };
  }

  if (typeof schema.$ref === 'string') {
    const refName = schema.$ref.split('/').pop() ?? preferredName;
    return { type: 'object', name: refName, refName, circular: true };
  }

  const nullable =
    schema.nullable === true ||
    (Array.isArray(schema.type) && schema.type.includes('null'));

  const result: NormalizedSchema = {
    name: preferredName,
    type: mapSchemaType(schema.type),
    format: typeof schema.format === 'string' ? schema.format : undefined,
    description: typeof schema.description === 'string' ? schema.description : undefined,
    nullable,
    enum: Array.isArray(schema.enum)
      ? (schema.enum.filter(
          (item) =>
            typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean',
        ) as Array<string | number | boolean>)
      : undefined,
    default: schema.default,
    minimum: typeof schema.minimum === 'number' ? schema.minimum : undefined,
    maximum: typeof schema.maximum === 'number' ? schema.maximum : undefined,
    minLength: typeof schema.minLength === 'number' ? schema.minLength : undefined,
    maxLength: typeof schema.maxLength === 'number' ? schema.maxLength : undefined,
    pattern: typeof schema.pattern === 'string' ? schema.pattern : undefined,
  };

  if (Array.isArray(schema.required)) {
    result.required = schema.required.filter((item): item is string => typeof item === 'string');
  }

  if (result.type === 'array') {
    result.items = normalizeSchema(schema.items ?? {}, `${preferredName}Item`, depth + 1);
  }

  if (result.type === 'object' || isPlainObject(schema.properties)) {
    result.type = result.type === 'unknown' ? 'object' : result.type;
    const properties: Record<string, NormalizedSchema> = {};
    const props = isPlainObject(schema.properties) ? schema.properties : {};
    const keys = Object.keys(props).slice(0, OPENAPI_LIMITS.maxPropertiesPerObject);
    for (const key of keys) {
      properties[key] = normalizeSchema(props[key], sanitizeIdentifier(key, 'Property'), depth + 1);
    }
    result.properties = properties;
  }

  if (schema.additionalProperties === false) {
    result.additionalProperties = false;
  } else if (schema.additionalProperties === true) {
    result.additionalProperties = true;
  } else if (isPlainObject(schema.additionalProperties)) {
    result.additionalProperties = normalizeSchema(
      schema.additionalProperties,
      `${preferredName}Additional`,
      depth + 1,
    );
  }

  // allOf / oneOf / anyOf — shallow merge of allOf objects for generation
  if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    const merged: NormalizedSchema = { type: 'object', name: preferredName, properties: {} };
    for (const part of schema.allOf) {
      const normalized = normalizeSchema(part, preferredName, depth + 1);
      if (normalized.properties) {
        merged.properties = { ...merged.properties, ...normalized.properties };
      }
      if (normalized.required) {
        merged.required = [...(merged.required ?? []), ...normalized.required];
      }
    }
    return { ...merged, ...result, type: 'object', properties: merged.properties };
  }

  if (!schema.type && result.properties) {
    result.type = 'object';
  }
  if (!schema.type && result.items) {
    result.type = 'array';
  }
  if (!schema.type && result.enum) {
    result.type = 'string';
  }

  return result;
};

const pickJsonContent = (
  content: unknown,
): { contentType: string; schema: unknown } | null => {
  if (!isPlainObject(content)) return null;
  const preferred = [
    'application/json',
    'application/vnd.api+json',
    'text/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
  ];
  for (const type of preferred) {
    if (isPlainObject(content[type]) && content[type].schema !== undefined) {
      return { contentType: type, schema: content[type].schema };
    }
  }
  for (const [contentType, media] of Object.entries(content)) {
    if (isPlainObject(media) && media.schema !== undefined) {
      return { contentType, schema: media.schema };
    }
  }
  return null;
};

const normalizeParameters = (
  parameters: unknown,
  path: string,
): NormalizedParameter[] => {
  if (!Array.isArray(parameters)) return [];
  const result: NormalizedParameter[] = [];

  for (const param of parameters) {
    if (!isPlainObject(param) || typeof param.name !== 'string') continue;
    const location = (typeof param.in === 'string' ? param.in : 'query') as ParameterLocation;
    if (!['path', 'query', 'header', 'cookie'].includes(location)) continue;

    const schemaSource =
      param.schema ??
      ({
        type: param.type,
        format: param.format,
        enum: param.enum,
        items: param.items,
      } as Record<string, unknown>);

    result.push({
      name: param.name,
      in: location,
      required: param.required === true || location === 'path',
      description: typeof param.description === 'string' ? param.description : undefined,
      schema: normalizeSchema(schemaSource, sanitizeIdentifier(param.name, 'Param')),
    });
  }

  // Ensure path params from template exist
  const pathParams = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]!);
  for (const name of pathParams) {
    if (!result.some((item) => item.in === 'path' && item.name === name)) {
      result.push({
        name,
        in: 'path',
        required: true,
        schema: { type: 'string', name: sanitizeIdentifier(name, 'Param') },
      });
    }
  }

  return result;
};

const normalizeRequestBody = (
  operation: Record<string, unknown>,
  isSwagger2: boolean,
  operationName: string,
): NormalizedRequestBody | null => {
  if (isSwagger2) {
    const bodyParam = Array.isArray(operation.parameters)
      ? operation.parameters.find(
          (param) => isPlainObject(param) && param.in === 'body',
        )
      : undefined;
    if (!isPlainObject(bodyParam)) return null;
    return {
      required: bodyParam.required === true,
      description: typeof bodyParam.description === 'string' ? bodyParam.description : undefined,
      contentType: 'application/json',
      schema: normalizeSchema(bodyParam.schema ?? {}, `${operationName}Request`),
    };
  }

  if (!isPlainObject(operation.requestBody)) return null;
  const picked = pickJsonContent(operation.requestBody.content);
  if (!picked) {
    return {
      required: operation.requestBody.required === true,
      description:
        typeof operation.requestBody.description === 'string'
          ? operation.requestBody.description
          : undefined,
      contentType: 'application/json',
      schema: null,
    };
  }

  return {
    required: operation.requestBody.required === true,
    description:
      typeof operation.requestBody.description === 'string'
        ? operation.requestBody.description
        : undefined,
    contentType: picked.contentType,
    schema: normalizeSchema(picked.schema, `${operationName}Request`),
  };
};

const normalizeResponses = (
  responses: unknown,
  isSwagger2: boolean,
  operationName: string,
): NormalizedResponse[] => {
  if (!isPlainObject(responses)) return [];
  const result: NormalizedResponse[] = [];

  for (const [statusCode, response] of Object.entries(responses)) {
    if (!isPlainObject(response)) continue;

    if (isSwagger2) {
      result.push({
        statusCode,
        description: typeof response.description === 'string' ? response.description : undefined,
        contentType: response.schema ? 'application/json' : undefined,
        schema: response.schema
          ? normalizeSchema(response.schema, `${operationName}Response${statusCode}`)
          : null,
      });
      continue;
    }

    const picked = pickJsonContent(response.content);
    result.push({
      statusCode,
      description: typeof response.description === 'string' ? response.description : undefined,
      contentType: picked?.contentType,
      schema: picked?.schema
        ? normalizeSchema(picked.schema, `${operationName}Response${statusCode}`)
        : null,
    });
  }

  return result;
};

const pickSuccessResponse = (responses: NormalizedResponse[]): NormalizedResponse | null => {
  const success = responses
    .filter((item) => /^2\d\d$/.test(item.statusCode) || item.statusCode === 'default')
    .sort((a, b) => a.statusCode.localeCompare(b.statusCode));
  return (
    success.find((item) => item.statusCode === '200') ??
    success.find((item) => item.statusCode === '201') ??
    success.find((item) => item.statusCode === '204') ??
    success[0] ??
    null
  );
};

const extractBaseUrl = (document: Record<string, unknown>, isSwagger2: boolean): string[] => {
  if (isSwagger2) {
    const host = typeof document.host === 'string' ? document.host : '';
    const basePath = typeof document.basePath === 'string' ? document.basePath : '';
    const schemes = Array.isArray(document.schemes)
      ? document.schemes.filter((item): item is string => typeof item === 'string')
      : ['https'];
    if (!host) return [basePath || ''];
    return schemes.map((scheme) => `${scheme}://${host}${basePath}`);
  }

  if (!Array.isArray(document.servers)) return [''];
  return document.servers
    .map((server) => (isPlainObject(server) && typeof server.url === 'string' ? server.url : null))
    .filter((url): url is string => Boolean(url));
};

const extractAuth = (
  document: Record<string, unknown>,
  isSwagger2: boolean,
): NormalizedAuthScheme[] => {
  const result: NormalizedAuthScheme[] = [];

  if (isSwagger2) {
    const securityDefinitions = document.securityDefinitions;
    if (!isPlainObject(securityDefinitions)) return result;
    for (const [name, def] of Object.entries(securityDefinitions)) {
      if (!isPlainObject(def) || typeof def.type !== 'string') continue;
      if (def.type === 'apiKey') {
        result.push({
          name,
          type: 'apiKey',
          in: (typeof def.in === 'string' ? def.in : 'header') as ParameterLocation,
          paramName: typeof def.name === 'string' ? def.name : name,
          description: typeof def.description === 'string' ? def.description : undefined,
        });
      } else if (def.type === 'basic') {
        result.push({ name, type: 'http', scheme: 'basic' });
      } else if (def.type === 'oauth2') {
        result.push({ name, type: 'oauth2' });
      }
    }
    return result;
  }

  const schemes = isPlainObject(document.components)
    ? document.components.securitySchemes
    : undefined;
  if (!isPlainObject(schemes)) return result;

  for (const [name, def] of Object.entries(schemes)) {
    if (!isPlainObject(def) || typeof def.type !== 'string') continue;
    if (def.type === 'apiKey') {
      result.push({
        name,
        type: 'apiKey',
        in: (typeof def.in === 'string' ? def.in : 'header') as ParameterLocation,
        paramName: typeof def.name === 'string' ? def.name : name,
        description: typeof def.description === 'string' ? def.description : undefined,
      });
    } else if (def.type === 'http') {
      result.push({
        name,
        type: 'http',
        scheme: typeof def.scheme === 'string' ? def.scheme : undefined,
        bearerFormat: typeof def.bearerFormat === 'string' ? def.bearerFormat : undefined,
        description: typeof def.description === 'string' ? def.description : undefined,
      });
    } else if (def.type === 'oauth2') {
      result.push({ name, type: 'oauth2' });
    } else if (def.type === 'openIdConnect') {
      result.push({ name, type: 'openIdConnect' });
    } else {
      result.push({ name, type: 'unknown' });
    }
  }

  return result;
};

const extractComponentSchemas = (
  document: Record<string, unknown>,
  isSwagger2: boolean,
): Record<string, NormalizedSchema> => {
  const source = isSwagger2
    ? document.definitions
    : isPlainObject(document.components)
      ? document.components.schemas
      : undefined;

  if (!isPlainObject(source)) return {};
  const result: Record<string, NormalizedSchema> = {};
  for (const [name, schema] of Object.entries(source)) {
    result[name] = normalizeSchema(schema, name);
  }
  return result;
};

export interface NormalizeDocumentInput {
  document: Record<string, unknown>;
  version: string;
  format: 'json' | 'yaml';
}

export const normalizeOpenApiDocument = (
  input: NormalizeDocumentInput,
): {
  title: string;
  version: string;
  description?: string;
  baseUrl: string;
  servers: string[];
  openapiVersion: string;
  documentFormat: 'json' | 'yaml';
  authentication: NormalizedAuthScheme[];
  endpoints: NormalizedEndpoint[];
  schemas: Record<string, NormalizedSchema>;
  tags: string[];
} => {
  const { document, version, format } = input;
  const isSwagger2 = version === '2.0' || version.startsWith('2.');
  const info = isPlainObject(document.info) ? document.info : {};
  const title = typeof info.title === 'string' ? info.title : 'API';
  const apiVersion = typeof info.version === 'string' ? info.version : '0.0.0';
  const description = typeof info.description === 'string' ? info.description : undefined;

  const servers = extractBaseUrl(document, isSwagger2);
  const paths = isPlainObject(document.paths) ? document.paths : {};
  const endpoints: NormalizedEndpoint[] = [];
  const usedOperationIds = new Set<string>();
  const tagSet = new Set<string>();

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!isPlainObject(pathItem)) continue;
    const sharedParams = pathItem.parameters;

    for (const [methodKey, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(methodKey.toLowerCase())) continue;
      if (!isPlainObject(operation)) {
        throw new OpenApiError('INVALID_OPERATION', `Invalid operation at ${methodKey.toUpperCase()} ${path}`);
      }

      const method = toMethod(methodKey);
      if (!method) continue;

      let operationId = deriveOperationId(
        method,
        path,
        typeof operation.operationId === 'string' ? operation.operationId : undefined,
      );
      let uniqueId = operationId;
      let suffix = 2;
      while (usedOperationIds.has(uniqueId)) {
        uniqueId = `${operationId}${suffix}`;
        suffix += 1;
      }
      usedOperationIds.add(uniqueId);
      operationId = uniqueId;

      const tags = Array.isArray(operation.tags)
        ? operation.tags.filter((tag): tag is string => typeof tag === 'string')
        : ['default'];
      tags.forEach((tag) => tagSet.add(tag));

      const parameters = normalizeParameters(
        [
          ...(Array.isArray(sharedParams) ? sharedParams : []),
          ...(Array.isArray(operation.parameters) ? operation.parameters : []),
        ],
        path,
      );

      const requestBody = normalizeRequestBody(operation, isSwagger2, sanitizeIdentifier(operationId, 'Op'));
      const responses = normalizeResponses(operation.responses, isSwagger2, sanitizeIdentifier(operationId, 'Op'));
      const successResponse = pickSuccessResponse(responses);

      endpoints.push({
        id: `${method}:${path}`,
        operationId,
        method,
        path: path.startsWith('/') ? path : `/${path}`,
        summary: typeof operation.summary === 'string' ? operation.summary : undefined,
        description: typeof operation.description === 'string' ? operation.description : undefined,
        tags,
        parameters,
        requestBody,
        responses,
        successResponse,
      });

      if (endpoints.length > OPENAPI_LIMITS.maxEndpoints) {
        throw new OpenApiError(
          'INVALID_OPENAPI',
          `Specification exceeds maximum of ${OPENAPI_LIMITS.maxEndpoints} endpoints`,
        );
      }
    }
  }

  // Collect global tags
  if (Array.isArray(document.tags)) {
    for (const tag of document.tags) {
      if (isPlainObject(tag) && typeof tag.name === 'string') {
        tagSet.add(tag.name);
      }
    }
  }

  return {
    title,
    version: apiVersion,
    description,
    baseUrl: servers[0] ?? '',
    servers,
    openapiVersion: version,
    documentFormat: format,
    authentication: extractAuth(document, isSwagger2),
    endpoints,
    schemas: extractComponentSchemas(document, isSwagger2),
    tags: [...tagSet],
  };
};

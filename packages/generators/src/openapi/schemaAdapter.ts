import type {
  NormalizedSchema,
  NormalizedEndpoint,
  ApiSpecification,
} from '@apicaptain/openapi';
import type {
  FieldType,
  NormalizedModelSet,
  ObjectDefinition,
} from '../shared/schema.js';
import { toPascalCase, uniqueTypeName } from '../typescript/identifiers.js';

interface BuildContext {
  definitions: ObjectDefinition[];
  usedNames: Set<string>;
  schemaCache: Map<string, string>;
}

const primitiveFromSchema = (schema: NormalizedSchema): FieldType => {
  switch (schema.type) {
    case 'string':
      return { kind: 'string' };
    case 'integer':
    case 'number':
      return { kind: 'number' };
    case 'boolean':
      return { kind: 'boolean' };
    case 'null':
      return { kind: 'null' };
    default:
      return { kind: 'unknown' };
  }
};

const maybeNullable = (type: FieldType, schema: NormalizedSchema): FieldType => {
  if (!schema.nullable) return type;
  if (type.kind === 'union') {
    return { kind: 'union', options: [...type.options, { kind: 'null' }] };
  }
  return { kind: 'union', options: [type, { kind: 'null' }] };
};

const fingerprintOf = (properties: Array<{ key: string; type: FieldType }>): string =>
  properties
    .map((property) => `${property.key}:${JSON.stringify(property.type)}`)
    .sort()
    .join('|');

export const schemaToFieldType = (
  schema: NormalizedSchema,
  preferredName: string,
  context: BuildContext,
): FieldType => {
  if (schema.circular && schema.refName) {
    return { kind: 'ref', name: toPascalCase(schema.refName) || preferredName };
  }

  if (schema.refName && context.schemaCache.has(schema.refName)) {
    return { kind: 'ref', name: context.schemaCache.get(schema.refName)! };
  }

  if (schema.type === 'array') {
    const element = schema.items
      ? schemaToFieldType(schema.items, `${preferredName}Item`, context)
      : ({ kind: 'unknown' } as FieldType);
    return maybeNullable({ kind: 'array', element }, schema);
  }

  if (schema.enum && schema.enum.length > 0 && schema.type !== 'object') {
    return maybeNullable(primitiveFromSchema(schema), schema);
  }

  if (schema.type === 'object' || schema.properties) {
    const properties = Object.entries(schema.properties ?? {}).map(([key, child]) => ({
      key,
      type: schemaToFieldType(child, toPascalCase(key) || 'Property', context),
    }));

    const fingerprint = fingerprintOf(properties);
    const existing = [...context.definitions].find((item) => item.fingerprint === fingerprint);
    if (existing) {
      return maybeNullable({ kind: 'ref', name: existing.name }, schema);
    }

    const name = uniqueTypeName(
      toPascalCase(schema.name || preferredName) || preferredName,
      context.usedNames,
    );
    if (schema.name) {
      context.schemaCache.set(schema.name, name);
    }
    if (schema.refName) {
      context.schemaCache.set(schema.refName, name);
    }

    const definition: ObjectDefinition = { name, properties, fingerprint };
    context.definitions.push(definition);
    return maybeNullable({ kind: 'ref', name }, schema);
  }

  return maybeNullable(primitiveFromSchema(schema), schema);
};

export const schemaToModelSet = (
  schema: NormalizedSchema | null | undefined,
  rootName: string,
): NormalizedModelSet | null => {
  if (!schema) return null;

  const context: BuildContext = {
    definitions: [],
    usedNames: new Set(),
    schemaCache: new Map(),
  };

  if (schema.type !== 'object' && !schema.properties) {
    if (schema.type === 'array') {
      const element = schema.items
        ? schemaToFieldType(schema.items, `${rootName}Item`, context)
        : ({ kind: 'unknown' } as FieldType);
      const name = uniqueTypeName(rootName, context.usedNames);
      context.definitions.push({
        name,
        properties: [{ key: 'items', type: { kind: 'array', element } }],
        fingerprint: `items:${JSON.stringify(element)}`,
      });
      return { rootName: name, definitions: context.definitions };
    }

    const name = uniqueTypeName(rootName, context.usedNames);
    const valueType = schemaToFieldType(schema, `${rootName}Value`, context);
    context.definitions.push({
      name,
      properties: [{ key: 'value', type: valueType }],
      fingerprint: `value:${JSON.stringify(valueType)}`,
    });
    return { rootName: name, definitions: context.definitions };
  }

  const rootRef = schemaToFieldType({ ...schema, name: rootName }, rootName, context);
  const rootTypeName = rootRef.kind === 'ref' ? rootRef.name : rootName;
  const rootDefinition = context.definitions.find((item) => item.name === rootTypeName);
  const nested = context.definitions.filter((item) => item.name !== rootTypeName);
  return {
    rootName: rootTypeName,
    definitions: rootDefinition ? [rootDefinition, ...nested] : context.definitions,
  };
};

export const collectEndpointModels = (
  endpoint: NormalizedEndpoint,
): { request: NormalizedModelSet | null; response: NormalizedModelSet | null } => {
  const opName = toPascalCase(endpoint.operationId) || 'Operation';
  const request = endpoint.requestBody?.schema
    ? schemaToModelSet(endpoint.requestBody.schema, `${opName}Request`)
    : null;

  const success = endpoint.successResponse;
  if (!success || success.statusCode === '204' || !success.schema) {
    return { request, response: null };
  }

  const response = schemaToModelSet(success.schema, `${opName}Response`);
  return { request, response };
};

export const mergeModelSets = (sets: NormalizedModelSet[]): NormalizedModelSet[] => {
  const seen = new Set<string>();
  const definitions: ObjectDefinition[] = [];
  for (const set of sets) {
    for (const definition of set.definitions) {
      if (seen.has(definition.name)) continue;
      seen.add(definition.name);
      definitions.push(definition);
    }
  }
  return [{ rootName: 'Models', definitions }];
};

export const groupEndpointsByTag = (
  endpoints: NormalizedEndpoint[],
): Map<string, NormalizedEndpoint[]> => {
  const groups = new Map<string, NormalizedEndpoint[]>();
  for (const endpoint of endpoints) {
    const tag = endpoint.tags[0] ?? 'default';
    const list = groups.get(tag) ?? [];
    list.push(endpoint);
    groups.set(tag, list);
  }
  return groups;
};

export const sanitizeFileSegment = (value: string): string => {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (!cleaned || cleaned.includes('..')) return 'api';
  return cleaned;
};

export const selectEndpoints = (
  specification: ApiSpecification,
  endpointIds?: string[] | 'all',
): NormalizedEndpoint[] => {
  if (!endpointIds || endpointIds === 'all') {
    return specification.endpoints;
  }
  const wanted = new Set(endpointIds);
  return specification.endpoints.filter(
    (endpoint) => wanted.has(endpoint.id) || wanted.has(endpoint.operationId),
  );
};

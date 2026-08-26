import { toPascalCase, uniqueTypeName } from '../typescript/identifiers.js';
import { isPlainObject } from '../typescript/parser.js';

export type PrimitiveKind = 'string' | 'number' | 'boolean' | 'null' | 'unknown';

export type FieldType =
  | { kind: PrimitiveKind }
  | { kind: 'ref'; name: string }
  | { kind: 'array'; element: FieldType }
  | { kind: 'union'; options: FieldType[] };

export interface ObjectDefinition {
  name: string;
  properties: Array<{ key: string; type: FieldType }>;
  fingerprint: string;
}

export interface NormalizedModelSet {
  rootName: string;
  definitions: ObjectDefinition[];
}

export interface NormalizedGenerationInput {
  method: string;
  endpoint: string;
  rootName: string;
  baseName: string;
  functionName: string;
  request: NormalizedModelSet | null;
  response: NormalizedModelSet;
}

const primitiveOf = (value: unknown): PrimitiveKind => {
  if (value === null) return 'null';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'unknown';
};

const fingerprintOf = (properties: Array<{ key: string; type: FieldType }>): string =>
  properties
    .map((property) => `${property.key}:${JSON.stringify(property.type)}`)
    .sort()
    .join('|');

const fieldTypeKey = (type: FieldType): string => JSON.stringify(type);

const unionTypes = (types: FieldType[]): FieldType => {
  const unique = new Map<string, FieldType>();
  for (const type of types) {
    unique.set(fieldTypeKey(type), type);
  }
  const options = [...unique.values()];
  if (options.length === 0) return { kind: 'unknown' };
  if (options.length === 1) return options[0]!;
  return { kind: 'union', options };
};

interface BuildContext {
  definitions: ObjectDefinition[];
  fingerprints: Map<string, string>;
  usedNames: Set<string>;
}

const inferArray = (values: unknown[], preferredName: string, context: BuildContext): FieldType => {
  if (values.length === 0) {
    return { kind: 'array', element: { kind: 'unknown' } };
  }

  const itemName = `${preferredName}Item`;
  const elements = values.map((value) => inferType(value, itemName, context));
  return { kind: 'array', element: unionTypes(elements) };
};

const registerObject = (
  value: Record<string, unknown>,
  preferredName: string,
  context: BuildContext,
): FieldType => {
  const properties = Object.keys(value).map((key) => {
    const childName = toPascalCase(key) || 'Property';
    return {
      key,
      type: inferType(value[key], childName, context),
    };
  });

  const fingerprint = fingerprintOf(properties);
  const existing = context.fingerprints.get(fingerprint);
  if (existing) {
    return { kind: 'ref', name: existing };
  }

  const name = uniqueTypeName(preferredName, context.usedNames);
  context.fingerprints.set(fingerprint, name);
  context.definitions.push({ name, properties, fingerprint });
  return { kind: 'ref', name };
};

const inferType = (value: unknown, preferredName: string, context: BuildContext): FieldType => {
  if (Array.isArray(value)) {
    return inferArray(value, preferredName, context);
  }
  if (isPlainObject(value)) {
    return registerObject(value, preferredName, context);
  }
  return { kind: primitiveOf(value) };
};

/**
 * Build a normalized model set from a JSON value.
 * Object definitions are ordered with the root model first.
 */
export const normalizeJsonModels = (json: unknown, rootName: string): NormalizedModelSet => {
  const context: BuildContext = {
    definitions: [],
    fingerprints: new Map(),
    usedNames: new Set(),
  };

  if (!isPlainObject(json)) {
    const name = uniqueTypeName(rootName, context.usedNames);
    const valueType = inferType(json, `${rootName}Value`, context);
    context.definitions.push({
      name,
      properties: [{ key: 'value', type: valueType }],
      fingerprint: `value:${JSON.stringify(valueType)}`,
    });
    return { rootName: name, definitions: context.definitions };
  }

  const rootRef = registerObject(json, rootName, context);
  const rootTypeName = rootRef.kind === 'ref' ? rootRef.name : rootName;
  const rootDefinition = context.definitions.find((item) => item.name === rootTypeName);
  const nested = context.definitions.filter((item) => item.name !== rootTypeName);
  const definitions = rootDefinition ? [rootDefinition, ...nested] : context.definitions;

  return { rootName: rootTypeName, definitions };
};

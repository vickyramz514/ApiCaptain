import type { GenerateTypeScriptOptions } from '@apicaptain/types';
import { formatPropertyKey, toPascalCase, uniqueTypeName } from './identifiers.js';
import { isPlainObject } from './parser.js';
import type { GeneratorContext, JsonObject, JsonValue, NamedTypeDefinition } from './types.js';

const DEFAULT_OPTIONS: GenerateTypeScriptOptions = {
  rootName: 'Root',
  outputType: 'interface',
  optionalProperties: false,
  useSemicolon: true,
  exportTypes: true,
};

const normalizeOptions = (
  options?: Partial<GenerateTypeScriptOptions>,
): GenerateTypeScriptOptions => ({
  rootName: options?.rootName?.trim() || DEFAULT_OPTIONS.rootName,
  outputType: options?.outputType ?? DEFAULT_OPTIONS.outputType,
  optionalProperties: options?.optionalProperties ?? DEFAULT_OPTIONS.optionalProperties,
  useSemicolon: options?.useSemicolon ?? DEFAULT_OPTIONS.useSemicolon,
  exportTypes: options?.exportTypes ?? DEFAULT_OPTIONS.exportTypes,
});

const inferPrimitive = (value: JsonValue): string => {
  if (value === null) return 'null';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'unknown';
};

const unionTypes = (types: string[]): string => {
  const unique = [...new Set(types)].sort();
  if (unique.length === 0) return 'unknown';
  if (unique.length === 1) return unique[0]!;
  return unique.join(' | ');
};

const buildFingerprint = (
  properties: Array<{ rawKey: string; typeExpression: string }>,
): string =>
  properties
    .map((property) => `${property.rawKey}:${property.typeExpression}`)
    .sort()
    .join('|');

const formatArrayType = (itemType: string): string => {
  const needsParens = itemType.includes('|') || itemType.startsWith('Array<');
  return needsParens ? `Array<${itemType}>` : `${itemType}[]`;
};

const inferArrayType = (values: JsonValue[], preferredName: string, context: GeneratorContext): string => {
  if (values.length === 0) {
    return 'unknown[]';
  }

  const itemName = `${preferredName}Item`;
  const itemTypes = values.map((item) => inferType(item, itemName, context, itemName));
  const unique = [...new Set(itemTypes)];

  if (unique.length === 1) {
    return formatArrayType(unique[0]!);
  }

  return `Array<${unionTypes(itemTypes)}>`;
};

const registerObjectType = (
  value: JsonObject,
  preferredName: string,
  context: GeneratorContext,
): string => {
  const propertyEntries = Object.keys(value).map((rawKey) => {
    const childPreferred = toPascalCase(rawKey) || 'Property';
    const typeExpression = inferType(value[rawKey] as JsonValue, childPreferred, context, childPreferred);
    return { rawKey, typeExpression };
  });

  const fingerprint = buildFingerprint(propertyEntries);
  const existing = context.fingerprints.get(fingerprint);
  if (existing) {
    return existing;
  }

  const name = uniqueTypeName(preferredName, context.usedNames);
  context.fingerprints.set(fingerprint, name);

  const definition: NamedTypeDefinition = {
    name,
    kind: 'object',
    properties: propertyEntries,
    fingerprint,
  };

  context.definitions.push(definition);
  return name;
};

const inferType = (
  value: JsonValue,
  preferredName: string,
  context: GeneratorContext,
  objectNameHint?: string,
): string => {
  if (Array.isArray(value)) {
    return inferArrayType(value, objectNameHint || preferredName, context);
  }

  if (isPlainObject(value)) {
    return registerObjectType(value, objectNameHint || preferredName, context);
  }

  return inferPrimitive(value);
};

const renderDefinition = (
  definition: NamedTypeDefinition,
  options: GenerateTypeScriptOptions,
): string => {
  const exportKeyword = options.exportTypes ? 'export ' : '';
  const optionalMark = options.optionalProperties ? '?' : '';
  const semicolon = options.useSemicolon ? ';' : '';

  const body =
    definition.properties.length === 0
      ? ''
      : definition.properties
          .map((property) => {
            const key = formatPropertyKey(property.rawKey);
            return `  ${key}${optionalMark}: ${property.typeExpression}${semicolon}`;
          })
          .join('\n');

  if (options.outputType === 'type') {
    if (!body) {
      return `${exportKeyword}type ${definition.name} = Record<string, unknown>${semicolon}`;
    }
    return `${exportKeyword}type ${definition.name} = {\n${body}\n}${semicolon}`;
  }

  if (!body) {
    return `${exportKeyword}interface ${definition.name} {}`;
  }

  return `${exportKeyword}interface ${definition.name} {\n${body}\n}`;
};

/**
 * Convert a JSON value into TypeScript interfaces or type aliases.
 * Deterministic for the same input + options.
 */
export const generateTypeScriptFromJson = (
  json: unknown,
  options?: Partial<GenerateTypeScriptOptions>,
): string => {
  const normalized = normalizeOptions(options);
  const context: GeneratorContext = {
    options: normalized,
    definitions: [],
    fingerprints: new Map(),
    usedNames: new Set(),
  };

  if (json === undefined) {
    throw new Error('JSON value is required');
  }

  if (!isPlainObject(json)) {
    const rootName = uniqueTypeName(normalized.rootName, context.usedNames);
    const valueType = inferType(json as JsonValue, `${normalized.rootName}Value`, context, normalized.rootName);
    const semicolon = normalized.useSemicolon ? ';' : '';
    const exportKeyword = normalized.exportTypes ? 'export ' : '';
    return `${exportKeyword}type ${rootName} = ${valueType}${semicolon}\n`;
  }

  const rootTypeName = registerObjectType(json, normalized.rootName, context);
  const rootDefinition = context.definitions.find((definition) => definition.name === rootTypeName);
  const nestedDefinitions = context.definitions.filter((definition) => definition.name !== rootTypeName);
  const ordered = rootDefinition ? [rootDefinition, ...nestedDefinitions] : context.definitions;

  return `${ordered.map((definition) => renderDefinition(definition, normalized)).join('\n\n')}\n`;
};

export { normalizeOptions, DEFAULT_OPTIONS };

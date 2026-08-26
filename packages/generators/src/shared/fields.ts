import { isValidIdentifier } from '../typescript/identifiers.js';
import { toCamelCase, toSnakeCase } from './naming.js';
import type { FieldType } from './schema.js';

export const sanitizePropertyName = (
  key: string,
  style: 'camel' | 'snake',
): { name: string; jsonKey: string; needsAlias: boolean } => {
  const base = style === 'snake' ? toSnakeCase(key) : toCamelCase(key);
  const safe =
    style === 'snake'
      ? /^[a-z_][a-z0-9_]*$/.test(base)
        ? base
        : `field_${base.replace(/[^a-z0-9_]/gi, '_') || 'value'}`
      : isValidIdentifier(base)
        ? base
        : `field${base.replace(/[^a-zA-Z0-9]/g, '') || 'Value'}`;

  return {
    name: safe,
    jsonKey: key,
    needsAlias: safe !== key && style === 'camel' ? key !== safe : key !== safe,
  };
};

export const mapFieldType = (
  type: FieldType,
  mapPrimitive: (kind: string) => string,
  mapRef: (name: string) => string,
  mapArray: (inner: string) => string,
  mapUnion: (parts: string[]) => string,
): string => {
  switch (type.kind) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'null':
    case 'unknown':
      return mapPrimitive(type.kind);
    case 'ref':
      return mapRef(type.name);
    case 'array':
      return mapArray(
        mapFieldType(type.element, mapPrimitive, mapRef, mapArray, mapUnion),
      );
    case 'union':
      return mapUnion(
        type.options.map((option) =>
          mapFieldType(option, mapPrimitive, mapRef, mapArray, mapUnion),
        ),
      );
    default:
      return mapPrimitive('unknown');
  }
};

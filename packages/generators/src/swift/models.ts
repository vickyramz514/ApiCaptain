import { mapFieldType, sanitizePropertyName } from '../shared/fields.js';
import type { FieldType, NormalizedModelSet, ObjectDefinition } from '../shared/schema.js';

const swiftType = (type: FieldType): string =>
  mapFieldType(
    type,
    (kind) => {
      switch (kind) {
        case 'string':
          return 'String';
        case 'number':
          return 'Double';
        case 'boolean':
          return 'Bool';
        case 'null':
          return 'NSNull';
        default:
          return 'AnyCodable';
      }
    },
    (name) => name,
    (inner) => `[${inner}]`,
    (parts) => parts[0] ?? 'AnyCodable',
  );

const renderStruct = (definition: ObjectDefinition): string => {
  const fields = definition.properties.map((property) => {
    const { name, jsonKey, needsAlias } = sanitizePropertyName(property.key, 'camel');
    return {
      name,
      jsonKey,
      needsAlias: needsAlias || name !== property.key,
      typeName: swiftType(property.type),
    };
  });

  const props = fields.map((field) => `    let ${field.name}: ${field.typeName}`).join('\n');
  const codingKeys = fields.some((field) => field.needsAlias)
    ? [
        '',
        '    enum CodingKeys: String, CodingKey {',
        ...fields.map((field) =>
          field.needsAlias
            ? `        case ${field.name} = "${field.jsonKey}"`
            : `        case ${field.name}`,
        ),
        '    }',
      ].join('\n')
    : '';

  return [`struct ${definition.name}: Codable {`, props, codingKeys, '}'].join('\n');
};

export const renderSwiftModels = (modelSets: NormalizedModelSet[]): string => {
  const seen = new Set<string>();
  const structs: string[] = [];
  for (const modelSet of modelSets) {
    for (const definition of modelSet.definitions) {
      if (seen.has(definition.name)) continue;
      seen.add(definition.name);
      structs.push(renderStruct(definition));
    }
  }
  return `${structs.join('\n\n')}\n`;
};

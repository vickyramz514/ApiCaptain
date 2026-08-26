import { mapFieldType, sanitizePropertyName } from '../shared/fields.js';
import type { FieldType, NormalizedModelSet, ObjectDefinition } from '../shared/schema.js';

const kotlinType = (type: FieldType): string =>
  mapFieldType(
    type,
    (kind) => {
      switch (kind) {
        case 'string':
          return 'String';
        case 'number':
          return 'Double';
        case 'boolean':
          return 'Boolean';
        case 'null':
          return 'Nothing?';
        default:
          return 'Any';
      }
    },
    (name) => name,
    (inner) => `List<${inner}>`,
    (parts) => parts[0] ?? 'Any',
  );

const renderDataClass = (definition: ObjectDefinition): string => {
  const fields = definition.properties.map((property) => {
    const { name, jsonKey, needsAlias } = sanitizePropertyName(property.key, 'camel');
    const serialized =
      needsAlias || name !== property.key
        ? `    @SerialName("${jsonKey}")\n    val ${name}: ${kotlinType(property.type)}`
        : `    val ${name}: ${kotlinType(property.type)}`;
    return serialized;
  });

  return [
    '@Serializable',
    `data class ${definition.name}(`,
    fields.join(',\n'),
    ')',
  ].join('\n');
};

export const renderKotlinModels = (modelSets: NormalizedModelSet[]): string => {
  const seen = new Set<string>();
  const classes: string[] = [
    'import kotlinx.serialization.SerialName',
    'import kotlinx.serialization.Serializable',
    '',
  ];

  for (const modelSet of modelSets) {
    for (const definition of modelSet.definitions) {
      if (seen.has(definition.name)) continue;
      seen.add(definition.name);
      classes.push(renderDataClass(definition), '');
    }
  }

  return `${classes.join('\n').trim()}\n`;
};

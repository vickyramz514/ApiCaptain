import { mapFieldType, sanitizePropertyName } from '../shared/fields.js';
import type { FieldType, NormalizedModelSet, ObjectDefinition } from '../shared/schema.js';
import { toCamelCase } from '../shared/naming.js';

const dartType = (type: FieldType): string =>
  mapFieldType(
    type,
    (kind) => {
      switch (kind) {
        case 'string':
          return 'String';
        case 'number':
          return 'num';
        case 'boolean':
          return 'bool';
        case 'null':
          return 'Null';
        default:
          return 'dynamic';
      }
    },
    (name) => name,
    (inner) => `List<${inner}>`,
    (parts) => parts.join(' /*|*/ ') || 'dynamic',
  );

const renderFromJsonValue = (type: FieldType, accessor: string): string => {
  if (type.kind === 'ref') {
    return `${type.name}.fromJson(${accessor} as Map<String, dynamic>)`;
  }
  if (type.kind === 'array') {
    if (type.element.kind === 'ref') {
      const refName = type.element.name;
      return `(${accessor} as List<dynamic>).map((e) => ${refName}.fromJson(e as Map<String, dynamic>)).toList()`;
    }
    return `(${accessor} as List<dynamic>).cast<${dartType(type.element)}>()`;
  }
  return `${accessor} as ${dartType(type)}`;
};

const renderToJsonValue = (type: FieldType, accessor: string): string => {
  if (type.kind === 'ref') {
    return `${accessor}.toJson()`;
  }
  if (type.kind === 'array' && type.element.kind === 'ref') {
    return `${accessor}.map((e) => e.toJson()).toList()`;
  }
  return accessor;
};

const renderClass = (definition: ObjectDefinition): string => {
  const fields = definition.properties.map((property) => {
    const { name, jsonKey } = sanitizePropertyName(property.key, 'camel');
    const typeName = dartType(property.type);
    return {
      name: name || toCamelCase(property.key),
      jsonKey,
      typeName,
      type: property.type,
    };
  });

  const fieldLines = fields.map((field) => `  final ${field.typeName} ${field.name};`).join('\n');
  const ctorParams = fields.map((field) => `    required this.${field.name},`).join('\n');
  const fromJsonParams = fields
    .map(
      (field) =>
        `      ${field.name}: ${renderFromJsonValue(field.type, `json['${field.jsonKey}']`)},`,
    )
    .join('\n');
  const toJsonEntries = fields
    .map((field) => `      '${field.jsonKey}': ${renderToJsonValue(field.type, field.name)},`)
    .join('\n');

  return [
    `class ${definition.name} {`,
    fieldLines,
    '',
    `  ${definition.name}({`,
    ctorParams,
    `  });`,
    '',
    `  factory ${definition.name}.fromJson(Map<String, dynamic> json) {`,
    `    return ${definition.name}(`,
    fromJsonParams,
    `    );`,
    `  }`,
    '',
    `  Map<String, dynamic> toJson() {`,
    `    return {`,
    toJsonEntries,
    `    };`,
    `  }`,
    `}`,
  ].join('\n');
};

export const renderDartModels = (modelSets: NormalizedModelSet[]): string => {
  const seen = new Set<string>();
  const classes: string[] = [];

  for (const modelSet of modelSets) {
    for (const definition of modelSet.definitions) {
      if (seen.has(definition.name)) continue;
      seen.add(definition.name);
      classes.push(renderClass(definition));
    }
  }

  return `${classes.join('\n\n')}\n`;
};

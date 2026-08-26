import { mapFieldType, sanitizePropertyName } from '../shared/fields.js';
import type { FieldType, NormalizedModelSet, ObjectDefinition } from '../shared/schema.js';

const pythonType = (type: FieldType): string =>
  mapFieldType(
    type,
    (kind) => {
      switch (kind) {
        case 'string':
          return 'str';
        case 'number':
          return 'float';
        case 'boolean':
          return 'bool';
        case 'null':
          return 'None';
        default:
          return 'Any';
      }
    },
    (name) => name,
    (inner) => `list[${inner}]`,
    (parts) => (parts.length > 1 ? `Union[${parts.join(', ')}]` : parts[0] ?? 'Any'),
  );

const renderFromDictValue = (type: FieldType, accessor: string): string => {
  if (type.kind === 'ref') {
    return `${type.name}.from_dict(${accessor})`;
  }
  if (type.kind === 'array' && type.element.kind === 'ref') {
    return `[${type.element.name}.from_dict(item) for item in (${accessor} or [])]`;
  }
  return accessor;
};

const renderToDictValue = (type: FieldType, accessor: string): string => {
  if (type.kind === 'ref') {
    return `${accessor}.to_dict()`;
  }
  if (type.kind === 'array' && type.element.kind === 'ref') {
    return `[item.to_dict() for item in ${accessor}]`;
  }
  return accessor;
};

const renderClass = (definition: ObjectDefinition): string => {
  const fields = definition.properties.map((property) => {
    const { name, jsonKey } = sanitizePropertyName(property.key, 'snake');
    return {
      name,
      jsonKey,
      typeName: pythonType(property.type),
      type: property.type,
    };
  });

  const annotations = fields.map((field) => `    ${field.name}: ${field.typeName}`).join('\n');
  const fromDictArgs = fields
    .map(
      (field) =>
        `            ${field.name}=${renderFromDictValue(field.type, `data["${field.jsonKey}"]`)},`,
    )
    .join('\n');
  const toDictEntries = fields
    .map((field) => {
      const value = renderToDictValue(field.type, `self.${field.name}`);
      return `            "${field.jsonKey}": ${value},`;
    })
    .join('\n');

  return [
    '@dataclass',
    `class ${definition.name}:`,
    annotations || '    pass',
    '',
    '    @classmethod',
    `    def from_dict(cls, data: dict[str, Any]) -> "${definition.name}":`,
    `        return cls(`,
    fromDictArgs,
    `        )`,
    '',
    '    def to_dict(self) -> dict[str, Any]:',
    '        return {',
    toDictEntries,
    '        }',
  ].join('\n');
};

export const renderPythonModels = (modelSets: NormalizedModelSet[]): string => {
  const seen = new Set<string>();
  const classes: string[] = [
    'from __future__ import annotations',
    '',
    'from dataclasses import dataclass',
    'from typing import Any, Union',
    '',
  ];

  for (const modelSet of modelSets) {
    for (const definition of modelSet.definitions) {
      if (seen.has(definition.name)) continue;
      seen.add(definition.name);
      classes.push(renderClass(definition), '');
    }
  }

  return `${classes.join('\n').trim()}\n`;
};

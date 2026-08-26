import type { GenerateRequest, GenerateResult, GeneratorTarget } from '@apicaptain/types';

const toPascalCase = (value: string): string =>
  value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('') || 'GeneratedType';

const generateTypescript = (name: string, schema: Record<string, unknown>): string => {
  const typeName = toPascalCase(name);
  const properties = (schema.properties ?? {}) as Record<string, { type?: string }>;
  const keys = Object.keys(properties);

  if (keys.length === 0) {
    return `export interface ${typeName} {\n  [key: string]: unknown;\n}\n`;
  }

  const fields = keys
    .map((key) => {
      const propType = properties[key]?.type ?? 'unknown';
      const tsType =
        propType === 'string'
          ? 'string'
          : propType === 'number' || propType === 'integer'
            ? 'number'
            : propType === 'boolean'
              ? 'boolean'
              : 'unknown';
      return `  ${key}: ${tsType};`;
    })
    .join('\n');

  return `export interface ${typeName} {\n${fields}\n}\n`;
};

const generateZod = (name: string, schema: Record<string, unknown>): string => {
  const typeName = toPascalCase(name);
  const properties = (schema.properties ?? {}) as Record<string, { type?: string }>;
  const keys = Object.keys(properties);

  const fields =
    keys.length === 0
      ? '  // TODO: map schema properties\n'
      : keys
          .map((key) => {
            const propType = properties[key]?.type ?? 'unknown';
            const zodType =
              propType === 'string'
                ? 'z.string()'
                : propType === 'number' || propType === 'integer'
                  ? 'z.number()'
                  : propType === 'boolean'
                    ? 'z.boolean()'
                    : 'z.unknown()';
            return `  ${key}: ${zodType},`;
          })
          .join('\n');

  return `import { z } from 'zod';\n\nexport const ${typeName}Schema = z.object({\n${fields}});\n\nexport type ${typeName} = z.infer<typeof ${typeName}Schema>;\n`;
};

const generateJsonSchema = (name: string, schema: Record<string, unknown>): string =>
  JSON.stringify({ $id: name, ...schema }, null, 2) + '\n';

const filenameFor = (name: string, target: GeneratorTarget): string => {
  const base = name.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase() || 'generated';
  if (target === 'typescript') return `${base}.ts`;
  if (target === 'zod') return `${base}.zod.ts`;
  return `${base}.schema.json`;
};

/**
 * Generate code artifacts from a JSON-like schema document.
 * Scaffold only — product features can extend targets and templates later.
 */
export const generateFromJson = (request: GenerateRequest): GenerateResult => {
  const { document, target } = request;
  const { name, schema } = document;

  let content: string;
  switch (target) {
    case 'typescript':
      content = generateTypescript(name, schema);
      break;
    case 'zod':
      content = generateZod(name, schema);
      break;
    case 'json-schema':
      content = generateJsonSchema(name, schema);
      break;
    default: {
      const exhaustive: never = target;
      throw new Error(`Unsupported generator target: ${String(exhaustive)}`);
    }
  }

  return {
    target,
    filename: filenameFor(name, target),
    content,
  };
};

export { toPascalCase };

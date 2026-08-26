const RESERVED = new Set([
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'null',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'as',
  'implements',
  'interface',
  'let',
  'package',
  'private',
  'protected',
  'public',
  'static',
  'yield',
  'any',
  'boolean',
  'constructor',
  'declare',
  'get',
  'module',
  'require',
  'number',
  'set',
  'string',
  'symbol',
  'type',
  'from',
  'of',
  'readonly',
  'keyof',
  'unique',
  'infer',
  'namespace',
  'abstract',
  'async',
  'await',
]);

export const isValidIdentifier = (value: string): boolean =>
  /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value) && !RESERVED.has(value);

export const toPascalCase = (value: string): string => {
  const parts = value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return 'GeneratedType';
  }

  const pascal = parts
    .map((part) => {
      const cleaned = part.replace(/^[^a-zA-Z]+/, '') || part;
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    })
    .join('');

  if (!pascal) {
    return 'GeneratedType';
  }

  return /^[0-9]/.test(pascal) ? `Type${pascal}` : pascal;
};

export const formatPropertyKey = (rawKey: string): string => {
  if (isValidIdentifier(rawKey)) {
    return rawKey;
  }

  return JSON.stringify(rawKey);
};

export const uniqueTypeName = (base: string, used: Set<string>): string => {
  let candidate = toPascalCase(base);
  if (!used.has(candidate)) {
    used.add(candidate);
    return candidate;
  }

  let index = 2;
  while (used.has(`${candidate}${index}`)) {
    index += 1;
  }

  const next = `${candidate}${index}`;
  used.add(next);
  return next;
};

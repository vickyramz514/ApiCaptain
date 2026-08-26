import { toPascalCase } from '../typescript/identifiers.js';

const METHOD_PREFIX: Record<string, string> = {
  GET: 'get',
  POST: 'create',
  PUT: 'update',
  PATCH: 'patch',
  DELETE: 'delete',
};

/** Derive a stable file/base name from an endpoint path (e.g. /api/login → login). */
export const endpointBaseName = (endpoint: string): string => {
  const cleaned = endpoint
    .split('?')[0]
    ?.replace(/\{[^}]+\}/g, '')
    .replace(/:[^/]+/g, '')
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '')
    ?? '';

  const segments = cleaned.split('/').filter(Boolean);
  const last = segments[segments.length - 1] || 'endpoint';
  const base = last
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return base || 'endpoint';
};

export const toCamelCase = (value: string): string => {
  const pascal = toPascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

/**
 * Prefer resource verbs for common REST shapes.
 * /api/login + POST → login
 * /api/users + GET → getUsers
 */
export const deriveFunctionName = (method: string, endpoint: string): string => {
  const base = endpointBaseName(endpoint);
  const camel = toCamelCase(base);

  if (['login', 'logout', 'register', 'signup', 'signin', 'signout'].includes(base)) {
    return camel;
  }

  if (method === 'POST' && !base.endsWith('s')) {
    return camel;
  }

  const prefix = METHOD_PREFIX[method] ?? method.toLowerCase();
  const resource = toPascalCase(base);
  return `${prefix}${resource}`;
};

export const deriveRequestTypeName = (baseName: string): string =>
  `${toPascalCase(baseName)}Request`;

export const deriveResponseTypeName = (baseName: string): string =>
  `${toPascalCase(baseName)}Response`;

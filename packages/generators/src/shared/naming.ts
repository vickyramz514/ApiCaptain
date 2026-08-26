import { toPascalCase } from '../typescript/identifiers.js';

export { toPascalCase };

export const toCamelCase = (value: string): string => {
  const pascal = toPascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

export const toSnakeCase = (value: string): string => {
  const pascal = toPascalCase(value);
  return pascal
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'value';
};

export const endpointBaseName = (endpoint: string): string => {
  const cleaned =
    endpoint
      .split('?')[0]
      ?.replace(/\{[^}]+\}/g, '')
      .replace(/:[^/]+/g, '')
      .replace(/\/+/g, '/')
      .replace(/^\/|\/$/g, '') ?? '';

  const segments = cleaned.split('/').filter(Boolean);
  const last = segments[segments.length - 1] || 'endpoint';
  return (
    last
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'endpoint'
  );
};

export const deriveFunctionName = (method: string, endpoint: string): string => {
  const base = endpointBaseName(endpoint);
  const camel = toCamelCase(base);

  if (['login', 'logout', 'register', 'signup', 'signin', 'signout'].includes(base)) {
    return camel;
  }

  if (method === 'POST' && !base.endsWith('s')) {
    return camel;
  }

  const prefixes: Record<string, string> = {
    GET: 'get',
    POST: 'create',
    PUT: 'update',
    PATCH: 'patch',
    DELETE: 'delete',
  };

  return `${prefixes[method] ?? method.toLowerCase()}${toPascalCase(base)}`;
};

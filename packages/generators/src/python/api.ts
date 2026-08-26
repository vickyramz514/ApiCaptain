import type { NormalizedGenerationInput } from '../shared/schema.js';
import { toSnakeCase } from '../shared/naming.js';

export const renderPythonApi = (input: NormalizedGenerationInput): string => {
  const module = toSnakeCase(input.baseName) + '_models';
  const path = input.endpoint.startsWith('/') ? input.endpoint : `/${input.endpoint}`;
  const hasBody = Boolean(input.request);
  const requestType = input.request?.rootName;
  const responseType = input.response.rootName;

  const imports = [
    'from __future__ import annotations',
    '',
    'import os',
    '',
    'import requests',
    '',
    `from ${module} import ${[responseType, requestType].filter(Boolean).join(', ')}`,
    '',
    'BASE_URL = os.getenv("API_BASE_URL", "")',
    '',
  ];

  if (hasBody && requestType) {
    return [
      ...imports,
      `def ${toSnakeCase(input.functionName)}(payload: ${requestType}) -> ${responseType}:`,
      `    response = requests.request(`,
      `        "${input.method}",`,
      `        f"{BASE_URL}${path}",`,
      `        json=payload.to_dict(),`,
      `        headers={"Content-Type": "application/json"},`,
      `        timeout=30,`,
      `    )`,
      `    response.raise_for_status()`,
      `    return ${responseType}.from_dict(response.json())`,
      '',
    ].join('\n');
  }

  return [
    ...imports,
    `def ${toSnakeCase(input.functionName)}() -> ${responseType}:`,
    `    response = requests.request(`,
    `        "${input.method}",`,
    `        f"{BASE_URL}${path}",`,
    `        timeout=30,`,
    `    )`,
    `    response.raise_for_status()`,
    `    return ${responseType}.from_dict(response.json())`,
    '',
  ].join('\n');
};

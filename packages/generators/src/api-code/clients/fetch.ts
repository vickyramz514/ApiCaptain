import type { ApiClientContext, HttpClientGenerator } from '../types.js';

export const fetchClientGenerator: HttpClientGenerator = {
  library: 'fetch',
  generate(context: ApiClientContext): string {
    const {
      method,
      endpoint,
      functionName,
      requestTypeName,
      responseTypeName,
      typesModuleName,
      hasRequestBody,
    } = context;

    const typeImports = [responseTypeName, requestTypeName].filter(Boolean).join(', ');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const urlExpr = `\`\${BASE_URL}${path}\``;

    const lines: string[] = [
      `import type { ${typeImports} } from './${typesModuleName}';`,
      '',
      `const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';`,
      '',
    ];

    if (hasRequestBody && requestTypeName) {
      lines.push(
        `export async function ${functionName}(payload: ${requestTypeName}): Promise<${responseTypeName}> {`,
        `  const response = await fetch(${urlExpr}, {`,
        `    method: '${method}',`,
        `    headers: {`,
        `      'Content-Type': 'application/json',`,
        `    },`,
        `    body: JSON.stringify(payload),`,
        `  });`,
        '',
        `  if (!response.ok) {`,
        `    throw new Error(\`Request failed with status \${response.status}\`);`,
        `  }`,
        '',
        `  return (await response.json()) as ${responseTypeName};`,
        `}`,
        '',
      );
    } else {
      lines.push(
        `export async function ${functionName}(): Promise<${responseTypeName}> {`,
        `  const response = await fetch(${urlExpr}, {`,
        `    method: '${method}',`,
        `  });`,
        '',
        `  if (!response.ok) {`,
        `    throw new Error(\`Request failed with status \${response.status}\`);`,
        `  }`,
        '',
        `  return (await response.json()) as ${responseTypeName};`,
        `}`,
        '',
      );
    }

    return lines.join('\n');
  },
};

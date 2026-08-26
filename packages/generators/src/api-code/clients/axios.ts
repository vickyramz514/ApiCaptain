import type { ApiClientContext, HttpClientGenerator } from '../types.js';

export const axiosClientGenerator: HttpClientGenerator = {
  library: 'axios',
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
    const lowerMethod = method.toLowerCase();
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const urlExpr = `\`\${BASE_URL}${path}\``;

    const lines: string[] = [
      `import axios from 'axios';`,
      `import type { ${typeImports} } from './${typesModuleName}';`,
      '',
      `const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';`,
      '',
    ];

    if (hasRequestBody && requestTypeName) {
      lines.push(
        `export async function ${functionName}(payload: ${requestTypeName}): Promise<${responseTypeName}> {`,
        `  const { data } = await axios.${lowerMethod}<${responseTypeName}>(${urlExpr}, payload);`,
        `  return data;`,
        `}`,
        '',
      );
    } else {
      lines.push(
        `export async function ${functionName}(): Promise<${responseTypeName}> {`,
        `  const { data } = await axios.${lowerMethod}<${responseTypeName}>(${urlExpr});`,
        `  return data;`,
        `}`,
        '',
      );
    }

    return lines.join('\n');
  },
};

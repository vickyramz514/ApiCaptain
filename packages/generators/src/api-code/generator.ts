import type { GenerateApiCodeData, GenerateApiCodeRequest, HttpMethod } from '@apicaptain/types';
import { generateTypeScriptFromJson } from '../typescript/generator.js';
import { getHttpClientGenerator } from './clients/index.js';
import {
  deriveFunctionName,
  deriveRequestTypeName,
  deriveResponseTypeName,
  endpointBaseName,
} from './naming.js';
import type { ApiClientContext } from './types.js';

const METHODS_WITH_BODY = new Set<HttpMethod>(['POST', 'PUT', 'PATCH']);

const mergeTypeFiles = (chunks: string[]): string => {
  const seen = new Set<string>();
  const blocks: string[] = [];

  for (const chunk of chunks) {
    const parts = chunk
      .trim()
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);

    for (const part of parts) {
      const key = part.replace(/\s+/g, ' ');
      if (seen.has(key)) continue;
      seen.add(key);
      blocks.push(part);
    }
  }

  return `${blocks.join('\n\n')}\n`;
};

export const generateApiCode = (request: GenerateApiCodeRequest): GenerateApiCodeData => {
  if (!request.library) {
    throw new Error('library is required for React Native generation');
  }

  if (request.framework !== 'react-native') {
    throw new Error(`Unsupported framework: ${request.framework}`);
  }

  const method = request.method;
  const endpoint = request.endpoint.trim();
  const baseName = endpointBaseName(endpoint);
  const functionName = deriveFunctionName(method, endpoint);
  const responseTypeName = deriveResponseTypeName(baseName);
  const requestTypeName = deriveRequestTypeName(baseName);
  const typesModuleName = `${baseName}.types`;

  const hasRequestBody =
    METHODS_WITH_BODY.has(method) &&
    request.requestJson !== undefined &&
    request.requestJson !== null;

  const typeChunks: string[] = [];

  if (hasRequestBody) {
    typeChunks.push(
      generateTypeScriptFromJson(request.requestJson, {
        rootName: requestTypeName,
        outputType: 'interface',
        optionalProperties: false,
        useSemicolon: true,
        exportTypes: true,
      }),
    );
  }

  typeChunks.push(
    generateTypeScriptFromJson(request.responseJson, {
      rootName: responseTypeName,
      outputType: 'interface',
      optionalProperties: false,
      useSemicolon: true,
      exportTypes: true,
    }),
  );

  const typesContent = mergeTypeFiles(typeChunks);

  const clientContext: ApiClientContext = {
    method,
    endpoint: endpoint.startsWith('/') ? endpoint : `/${endpoint}`,
    functionName,
    requestTypeName: hasRequestBody ? requestTypeName : null,
    responseTypeName,
    typesModuleName,
    hasRequestBody,
  };

  const clientGenerator = getHttpClientGenerator(request.library);
  const apiContent = clientGenerator.generate(clientContext);

  return {
    files: [
      {
        filename: `${baseName}.types.ts`,
        content: typesContent,
        language: 'typescript',
      },
      {
        filename: `${baseName}.api.ts`,
        content: apiContent,
        language: 'typescript',
      },
    ],
    meta: {
      baseName,
      functionName,
      requestTypeName: hasRequestBody ? requestTypeName : null,
      responseTypeName,
      method,
      endpoint: clientContext.endpoint,
      framework: request.framework,
      library: request.library,
      rootName: request.rootName?.trim() || baseName,
    },
  };
};

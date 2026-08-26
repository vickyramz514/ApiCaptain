import type { ApiSpecification, NormalizedEndpoint, NormalizedAuthScheme } from '@apicaptain/openapi';
import type {
  ApiFramework,
  GeneratedFile,
  HttpLibrary,
  OpenApiGenerateData,
  OpenApiLibrary,
} from '@apicaptain/types';
import { renderDartModels } from '../dart/models.js';
import { renderSwiftModels } from '../swift/models.js';
import { renderKotlinModels } from '../kotlin/models.js';
import { renderPythonModels } from '../python/models.js';
import { toCamelCase, toPascalCase, toSnakeCase } from '../shared/naming.js';
import type { NormalizedModelSet } from '../shared/schema.js';
import {
  collectEndpointModels,
  groupEndpointsByTag,
  mergeModelSets,
  sanitizeFileSegment,
  selectEndpoints,
} from './schemaAdapter.js';

const safePath = (filename: string): string => {
  const cleaned = filename.replace(/\\/g, '/').replace(/\.\./g, '');
  if (cleaned.includes('\0') || cleaned.startsWith('/')) {
    return `api/${sanitizeFileSegment(cleaned)}`;
  }
  return cleaned;
};

const defaultLibrary = (
  framework: ApiFramework,
  library?: OpenApiLibrary | HttpLibrary,
): OpenApiLibrary | HttpLibrary => {
  if (framework === 'react-native') {
    return library === 'fetch' ? 'fetch' : 'axios';
  }
  if (framework === 'flutter') return 'dio';
  if (framework === 'swiftui') return 'urlsession';
  if (framework === 'android') return 'retrofit';
  return 'httpx';
};

const pathToTemplate = (path: string, style: 'ts' | 'dart' | 'swift' | 'kotlin' | 'python'): string => {
  if (style === 'ts' || style === 'dart' || style === 'swift' || style === 'python') {
    return path.replace(/\{([^}]+)\}/g, (_, name: string) => `\${${toCamelCase(name)}}`);
  }
  // Retrofit uses {name}
  return path;
};

const paramArgs = (endpoint: NormalizedEndpoint, lang: 'ts' | 'dart' | 'swift' | 'kotlin' | 'python') => {
  const parts: string[] = [];
  for (const param of endpoint.parameters) {
    const name =
      lang === 'python' ? toSnakeCase(param.name) : toCamelCase(param.name);
    const type =
      param.schema.type === 'integer' || param.schema.type === 'number'
        ? lang === 'ts'
          ? 'number'
          : lang === 'dart'
            ? 'num'
            : lang === 'swift'
              ? 'Double'
              : lang === 'kotlin'
                ? 'Double'
                : 'float'
        : param.schema.type === 'boolean'
          ? lang === 'ts'
            ? 'boolean'
            : lang === 'dart'
              ? 'bool'
              : lang === 'swift'
                ? 'Bool'
                : lang === 'kotlin'
                  ? 'Boolean'
                  : 'bool'
          : lang === 'ts'
            ? 'string'
            : lang === 'dart'
              ? 'String'
              : lang === 'swift'
                ? 'String'
                : lang === 'kotlin'
                  ? 'String'
                  : 'str';
    parts.push(`${name}: ${type}`);
  }
  return parts;
};

const emptyObjectResponse = (): NormalizedModelSet => ({
  rootName: 'EmptyResponse',
  definitions: [
    {
      name: 'EmptyResponse',
      properties: [],
      fingerprint: 'empty',
    },
  ],
});

const renderAuthConfigTs = (auth: NormalizedAuthScheme[]): string => {
  const lines = [
    '/** Configure authentication for the generated API client. Do not hard-code secrets. */',
    'export interface ApiAuthConfig {',
    '  bearerToken?: string;',
    '  basicUsername?: string;',
    '  basicPassword?: string;',
    '  apiKey?: string;',
    '}',
    '',
    'export const authConfig: ApiAuthConfig = {};',
    '',
  ];
  if (auth.length) {
    lines.push('/** Detected OpenAPI security schemes (configure via authConfig). */');
    lines.push('export const detectedSecuritySchemes = [');
    for (const scheme of auth) {
      lines.push(
        `  { name: '${scheme.name}', type: '${scheme.type}', scheme: '${scheme.scheme ?? ''}' },`,
      );
    }
    lines.push('] as const;', '');
  }
  return lines.join('\n');
};

const generateReactNative = (
  specification: ApiSpecification,
  endpoints: NormalizedEndpoint[],
  library: 'axios' | 'fetch',
  baseUrl: string,
): GeneratedFile[] => {
  const files: GeneratedFile[] = [];
  const groups = groupEndpointsByTag(endpoints);
  const allModels: NormalizedModelSet[] = [];

  files.push({
    filename: safePath('api/client.ts'),
    language: 'typescript',
    content: [
      library === 'axios' ? `import axios from 'axios';` : '',
      `import { authConfig } from './auth';`,
      '',
      `export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? ${JSON.stringify(baseUrl)};`,
      '',
      library === 'axios'
        ? [
            'export const apiClient = axios.create({',
            '  baseURL: API_BASE_URL,',
            '  headers: { "Content-Type": "application/json" },',
            '});',
            '',
            'apiClient.interceptors.request.use((config) => {',
            '  if (authConfig.bearerToken) {',
            '    config.headers.Authorization = `Bearer ${authConfig.bearerToken}`;',
            '  } else if (authConfig.apiKey) {',
            '    config.headers["X-API-Key"] = authConfig.apiKey;',
            '  }',
            '  return config;',
            '});',
            '',
          ].join('\n')
        : [
            'export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {',
            '  const headers = new Headers(init.headers);',
            '  if (!headers.has("Content-Type") && init.body) {',
            '    headers.set("Content-Type", "application/json");',
            '  }',
            '  if (authConfig.bearerToken) {',
            '    headers.set("Authorization", `Bearer ${authConfig.bearerToken}`);',
            '  } else if (authConfig.apiKey) {',
            '    headers.set("X-API-Key", authConfig.apiKey);',
            '  }',
            '  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });',
            '  if (!response.ok) {',
            '    throw new Error(`Request failed with status ${response.status}`);',
            '  }',
            '  return response;',
            '}',
            '',
          ].join('\n'),
    ]
      .filter(Boolean)
      .join('\n'),
  });

  files.push({
    filename: safePath('api/auth.ts'),
    language: 'typescript',
    content: renderAuthConfigTs(specification.authentication),
  });

  for (const [tag, tagEndpoints] of groups) {
    const folder = sanitizeFileSegment(tag);
    const modelSets: NormalizedModelSet[] = [];
    const apiFns: string[] = [];

    for (const endpoint of tagEndpoints) {
      const models = collectEndpointModels(endpoint);
      if (models.request) modelSets.push(models.request);
      if (models.response) modelSets.push(models.response);
      else modelSets.push(emptyObjectResponse());

      const requestType = models.request?.rootName;
      const responseType = models.response?.rootName ?? 'void';
      const args = paramArgs(endpoint, 'ts');
      if (requestType) args.push(`payload: ${requestType}`);
      const pathExpr = '`' + pathToTemplate(endpoint.path, 'ts') + '`';
      const queryParams = endpoint.parameters.filter((p) => p.in === 'query');
      const headerParams = endpoint.parameters.filter((p) => p.in === 'header');

      if (library === 'axios') {
        const configParts: string[] = [];
        if (queryParams.length) {
          configParts.push(
            `params: { ${queryParams.map((p) => toCamelCase(p.name)).join(', ')} }`,
          );
        }
        if (headerParams.length) {
          configParts.push(
            `headers: { ${headerParams.map((p) => `'${p.name}': ${toCamelCase(p.name)}`).join(', ')} }`,
          );
        }
        const dataPart = requestType ? 'data: payload,' : '';
        apiFns.push(
          `export async function ${endpoint.operationId}(${args.join(', ')}): Promise<${responseType}> {`,
          `  const { data } = await apiClient.request<${responseType}>({`,
          `    method: '${endpoint.method}',`,
          `    url: ${pathExpr},`,
          dataPart,
          ...configParts.map((part) => `    ${part},`),
          `  });`,
          `  return data;`,
          `}`,
          '',
        );
      } else {
        const query = queryParams.length
          ? `const query = new URLSearchParams({ ${queryParams.map((p) => `${toCamelCase(p.name)}: String(${toCamelCase(p.name)})`).join(', ')} }).toString();\n  const url = query ? \`${pathToTemplate(endpoint.path, 'ts')}?\${query}\` : ${pathExpr};`
          : `const url = ${pathExpr};`;
        const headers =
          headerParams.length > 0
            ? `{ ${headerParams.map((p) => `'${p.name}': ${toCamelCase(p.name)}`).join(', ')} }`
            : '{}';
        if (requestType && ['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
          apiFns.push(
            `export async function ${endpoint.operationId}(${args.join(', ')}): Promise<${responseType}> {`,
            `  ${query}`,
            `  const response = await apiFetch(url, { method: '${endpoint.method}', headers: ${headers}, body: JSON.stringify(payload) });`,
            responseType === 'void' ? '  return;' : `  return (await response.json()) as ${responseType};`,
            `}`,
            '',
          );
        } else {
          apiFns.push(
            `export async function ${endpoint.operationId}(${args.join(', ')}): Promise<${responseType}> {`,
            `  ${query}`,
            `  const response = await apiFetch(url, { method: '${endpoint.method}', headers: ${headers} });`,
            responseType === 'void' || endpoint.successResponse?.statusCode === '204'
              ? '  return;'
              : `  if (response.status === 204) return undefined as unknown as ${responseType};\n  return (await response.json()) as ${responseType};`,
            `}`,
            '',
          );
        }
      }
    }

    const merged = mergeModelSets(modelSets);

    files.push({
      filename: safePath(`api/${folder}/${folder}.types.ts`),
      language: 'typescript',
      content: renderTsInterfaces(merged[0]!.definitions),
    });

    const typeNames = [
      ...new Set(modelSets.flatMap((m) => m.definitions.map((d) => d.name))),
    ];
    const imports = [
      `import { ${library === 'axios' ? 'apiClient' : 'apiFetch'} } from '../client';`,
      typeNames.length
        ? `import type { ${typeNames.join(', ')} } from './${folder}.types';`
        : '',
      '',
    ]
      .filter(Boolean)
      .join('\n');

    files.push({
      filename: safePath(`api/${folder}/${folder}.api.ts`),
      language: 'typescript',
      content: `${imports}\n${apiFns.join('\n')}`,
    });
  }

  void allModels;
  return files;
};

const needsQuotes = (key: string): boolean => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key);

const renderTsField = (type: import('../shared/schema.js').FieldType): string => {
  switch (type.kind) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    case 'unknown':
      return 'unknown';
    case 'ref':
      return type.name;
    case 'array':
      return `Array<${renderTsField(type.element)}>`;
    case 'union':
      return type.options.map(renderTsField).join(' | ');
    default:
      return 'unknown';
  }
};

const renderTsInterfaces = (
  definitions: import('../shared/schema.js').ObjectDefinition[],
): string => {
  const blocks = definitions.map((definition) => {
    const props = definition.properties
      .map((property) => {
        const key = needsQuotes(property.key) ? JSON.stringify(property.key) : property.key;
        return `  ${key}: ${renderTsField(property.type)};`;
      })
      .join('\n');
    return `export interface ${definition.name} {\n${props}\n}`;
  });
  return `${blocks.join('\n\n')}\n`;
};

const generateFlutter = (
  specification: ApiSpecification,
  endpoints: NormalizedEndpoint[],
  baseUrl: string,
): GeneratedFile[] => {
  const files: GeneratedFile[] = [];
  const groups = groupEndpointsByTag(endpoints);

  files.push({
    filename: safePath('lib/api/client.dart'),
    language: 'dart',
    content: [
      "import 'package:dio/dio.dart';",
      '',
      'class ApiCaptainConfig {',
      `  static String baseUrl = const String.fromEnvironment('API_BASE_URL', defaultValue: ${JSON.stringify(baseUrl)});`,
      "  static String? bearerToken;",
      "  static String? apiKey;",
      '}',
      '',
      'final Dio apiClient = Dio(BaseOptions(',
      '  baseUrl: ApiCaptainConfig.baseUrl,',
      "  headers: {'Content-Type': 'application/json'},",
      '))..interceptors.add(InterceptorsWrapper(',
      '  onRequest: (options, handler) {',
      '    if (ApiCaptainConfig.bearerToken != null) {',
      "      options.headers['Authorization'] = 'Bearer \${ApiCaptainConfig.bearerToken}';",
      '    } else if (ApiCaptainConfig.apiKey != null) {',
      "      options.headers['X-API-Key'] = ApiCaptainConfig.apiKey;",
      '    }',
      '    handler.next(options);',
      '  },',
      '));',
      '',
      `// Detected auth schemes: ${specification.authentication.map((a) => a.name).join(', ') || 'none'}`,
      '',
    ].join('\n'),
  });

  for (const [tag, tagEndpoints] of groups) {
    const folder = sanitizeFileSegment(tag);
    const modelSets: NormalizedModelSet[] = [];
    const methods: string[] = [];

    for (const endpoint of tagEndpoints) {
      const models = collectEndpointModels(endpoint);
      if (models.request) modelSets.push(models.request);
      if (models.response) modelSets.push(models.response);

      const requestType = models.request?.rootName;
      const responseType = models.response?.rootName ?? 'void';
      const args = paramArgs(endpoint, 'dart');
      if (requestType) args.push(`${requestType} payload`);
      const dartPath = endpoint.path.replace(/\{([^}]+)\}/g, (_, n: string) => `\$${toCamelCase(n)}`);
      const query = endpoint.parameters
        .filter((p) => p.in === 'query')
        .map((p) => `'${p.name}': ${toCamelCase(p.name)}`)
        .join(', ');
      const headers = endpoint.parameters
        .filter((p) => p.in === 'header')
        .map((p) => `'${p.name}': ${toCamelCase(p.name)}`)
        .join(', ');

      methods.push(
        `  Future<${responseType === 'void' ? 'void' : responseType}> ${endpoint.operationId}(${args.join(', ')}) async {`,
        `    final response = await apiClient.request(`,
        `      '${dartPath}',`,
        `      options: Options(method: '${endpoint.method}'${headers ? `, headers: {${headers}}` : ''}),`,
        query ? `      queryParameters: {${query}},` : '',
        requestType ? '      data: payload.toJson(),' : '',
        '    );',
        responseType === 'void'
          ? '    return;'
          : `    return ${responseType}.fromJson(response.data as Map<String, dynamic>);`,
        '  }',
        '',
      );
    }

    files.push({
      filename: safePath(`lib/api/${folder}/${folder}_models.dart`),
      language: 'dart',
      content: renderDartModels(modelSets.length ? modelSets : [emptyObjectResponse()]),
    });

    files.push({
      filename: safePath(`lib/api/${folder}/${folder}_api.dart`),
      language: 'dart',
      content: [
        `import 'package:dio/dio.dart';`,
        `import '../client.dart';`,
        `import '${folder}_models.dart';`,
        '',
        `class ${toPascalCase(tag) || 'Api'}Api {`,
        ...methods,
        '}',
        '',
      ].join('\n'),
    });
  }

  return files;
};

const generateSwift = (
  specification: ApiSpecification,
  endpoints: NormalizedEndpoint[],
  baseUrl: string,
): GeneratedFile[] => {
  const files: GeneratedFile[] = [];
  const groups = groupEndpointsByTag(endpoints);
  const allModels: NormalizedModelSet[] = [];
  const methods: string[] = [];

  for (const [, tagEndpoints] of groups) {
    for (const endpoint of tagEndpoints) {
      const models = collectEndpointModels(endpoint);
      if (models.request) allModels.push(models.request);
      if (models.response) allModels.push(models.response);

      const requestType = models.request?.rootName;
      const responseType = models.response?.rootName;
      const args = paramArgs(endpoint, 'swift');
      if (requestType) args.push(`payload: ${requestType}`);
      const pathLiteral = endpoint.path.replace(
        /\{([^}]+)\}/g,
        (_, n: string) => `\\(${toCamelCase(n)})`,
      );

      methods.push(
        `    func ${endpoint.operationId}(${args.join(', ')}) async throws${responseType ? ` -> ${responseType}` : ''} {`,
        `        guard let url = URL(string: ApiCaptainConfig.baseURL + "${pathLiteral}") else { throw URLError(.badURL) }`,
        '        var request = URLRequest(url: url)',
        `        request.httpMethod = "${endpoint.method}"`,
        '        request.setValue("application/json", forHTTPHeaderField: "Content-Type")',
        '        if let token = ApiCaptainConfig.bearerToken {',
        '            request.setValue("Bearer \\(token)", forHTTPHeaderField: "Authorization")',
        '        }',
        requestType ? '        request.httpBody = try JSONEncoder().encode(payload)' : '',
        '        let (data, response) = try await URLSession.shared.data(for: request)',
        '        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {',
        '            throw URLError(.badServerResponse)',
        '        }',
        responseType
          ? `        if http.statusCode == 204 {\n            throw URLError(.cannotDecodeContentData)\n        }\n        return try JSONDecoder().decode(${responseType}.self, from: data)`
          : '        return',
        '    }',
        '',
      );
    }
  }

  files.push({
    filename: safePath('API/Models.swift'),
    language: 'swift',
    content: renderSwiftModels(allModels.length ? allModels : [emptyObjectResponse()]),
  });

  files.push({
    filename: safePath('API/APIClient.swift'),
    language: 'swift',
    content: [
      'import Foundation',
      '',
      'enum ApiCaptainConfig {',
      `    static var baseURL = ProcessInfo.processInfo.environment["API_BASE_URL"] ?? ${JSON.stringify(baseUrl)}`,
      '    static var bearerToken: String?',
      '    static var apiKey: String?',
      '}',
      '',
      `// Auth schemes: ${specification.authentication.map((a) => a.name).join(', ') || 'none'}`,
      '',
      'struct ApiClient {',
      ...methods,
      '}',
      '',
    ].join('\n'),
  });

  return files;
};

const generateKotlin = (
  specification: ApiSpecification,
  endpoints: NormalizedEndpoint[],
  baseUrl: string,
): GeneratedFile[] => {
  const files: GeneratedFile[] = [];
  const groups = groupEndpointsByTag(endpoints);
  const allModels: NormalizedModelSet[] = [];

  files.push({
    filename: safePath('api/ApiClient.kt'),
    language: 'kotlin',
    content: [
      'import okhttp3.OkHttpClient',
      'import retrofit2.Retrofit',
      'import retrofit2.converter.gson.GsonConverterFactory',
      '',
      'object ApiCaptainConfig {',
      `    var baseUrl: String = System.getenv("API_BASE_URL") ?: ${JSON.stringify(baseUrl)}`,
      '    var bearerToken: String? = null',
      '    var apiKey: String? = null',
      '}',
      '',
      `// Auth schemes: ${specification.authentication.map((a) => a.name).join(', ') || 'none'}`,
      '',
      'private val okHttpClient = OkHttpClient.Builder()',
      '    .addInterceptor { chain ->',
      '        val builder = chain.request().newBuilder()',
      '        ApiCaptainConfig.bearerToken?.let { builder.header("Authorization", "Bearer $it") }',
      '        ApiCaptainConfig.apiKey?.let { builder.header("X-API-Key", it) }',
      '        chain.proceed(builder.build())',
      '    }',
      '    .build()',
      '',
      'val retrofit: Retrofit = Retrofit.Builder()',
      '    .baseUrl(if (ApiCaptainConfig.baseUrl.endsWith("/")) ApiCaptainConfig.baseUrl else ApiCaptainConfig.baseUrl + "/")',
      '    .client(okHttpClient)',
      '    .addConverterFactory(GsonConverterFactory.create())',
      '    .build()',
      '',
    ].join('\n'),
  });

  for (const [tag, tagEndpoints] of groups) {
    const folder = sanitizeFileSegment(tag);
    const modelSets: NormalizedModelSet[] = [];
    const methods: string[] = [];

    for (const endpoint of tagEndpoints) {
      const models = collectEndpointModels(endpoint);
      if (models.request) modelSets.push(models.request);
      if (models.response) modelSets.push(models.response);

      const requestType = models.request?.rootName;
      const responseType = models.response?.rootName ?? 'Unit';
      const annotations: string[] = [];
      const args: string[] = [];

      for (const param of endpoint.parameters) {
        const name = toCamelCase(param.name);
        const type =
          param.schema.type === 'integer' || param.schema.type === 'number'
            ? 'Double'
            : param.schema.type === 'boolean'
              ? 'Boolean'
              : 'String';
        if (param.in === 'path') {
          args.push(`@Path("${param.name}") ${name}: ${type}`);
        } else if (param.in === 'query') {
          args.push(`@Query("${param.name}") ${name}: ${type}`);
        } else if (param.in === 'header') {
          args.push(`@Header("${param.name}") ${name}: ${type}`);
        }
      }
      if (requestType) {
        args.push(`@Body payload: ${requestType}`);
      }

      const retrofitPath = endpoint.path.replace(/^\//, '');
      annotations.push(`    @${endpoint.method}("${retrofitPath}")`);
      methods.push(
        ...annotations,
        `    suspend fun ${endpoint.operationId}(`,
        `        ${args.join(',\n        ')}`,
        `    ): ${responseType}`,
        '',
      );
    }

    allModels.push(...modelSets);
    files.push({
      filename: safePath(`api/${folder}/${toPascalCase(tag) || 'Api'}Models.kt`),
      language: 'kotlin',
      content: renderKotlinModels(modelSets.length ? modelSets : [emptyObjectResponse()]),
    });

    files.push({
      filename: safePath(`api/${folder}/${toPascalCase(tag) || 'Api'}Service.kt`),
      language: 'kotlin',
      content: [
        'import retrofit2.http.*',
        '',
        `interface ${toPascalCase(tag) || 'Api'}Service {`,
        ...methods,
        '}',
        '',
      ].join('\n'),
    });
  }

  void allModels;
  return files;
};

const generatePython = (
  specification: ApiSpecification,
  endpoints: NormalizedEndpoint[],
  baseUrl: string,
): GeneratedFile[] => {
  const files: GeneratedFile[] = [];
  const groups = groupEndpointsByTag(endpoints);

  files.push({
    filename: safePath('api/client.py'),
    language: 'python',
    content: [
      'from __future__ import annotations',
      '',
      'import os',
      '',
      'import httpx',
      '',
      `BASE_URL = os.getenv("API_BASE_URL", ${JSON.stringify(baseUrl)})`,
      'BEARER_TOKEN: str | None = None',
      'API_KEY: str | None = None',
      '',
      `DETECT_AUTH = ${JSON.stringify(specification.authentication.map((a) => ({ name: a.name, type: a.type })))}`,
      '',
      'def build_client() -> httpx.Client:',
      '    headers: dict[str, str] = {"Content-Type": "application/json"}',
      '    if BEARER_TOKEN:',
      '        headers["Authorization"] = f"Bearer {BEARER_TOKEN}"',
      '    elif API_KEY:',
      '        headers["X-API-Key"] = API_KEY',
      '    return httpx.Client(base_url=BASE_URL, headers=headers, timeout=30.0)',
      '',
    ].join('\n'),
  });

  for (const [tag, tagEndpoints] of groups) {
    const folder = sanitizeFileSegment(tag);
    const modelSets: NormalizedModelSet[] = [];
    const methods: string[] = [];

    for (const endpoint of tagEndpoints) {
      const models = collectEndpointModels(endpoint);
      if (models.request) modelSets.push(models.request);
      if (models.response) modelSets.push(models.response);

      const requestType = models.request?.rootName;
      const responseType = models.response?.rootName;
      const args = paramArgs(endpoint, 'python');
      if (requestType) args.push(`payload: ${requestType}`);
      const fn = toSnakeCase(endpoint.operationId);
      const pathExpr = endpoint.path.replace(
        /\{([^}]+)\}/g,
        (_, n: string) => `{${toSnakeCase(n)}}`,
      );
      const query = endpoint.parameters
        .filter((p) => p.in === 'query')
        .map((p) => `"${p.name}": ${toSnakeCase(p.name)}`)
        .join(', ');
      const headers = endpoint.parameters
        .filter((p) => p.in === 'header')
        .map((p) => `"${p.name}": ${toSnakeCase(p.name)}`)
        .join(', ');

      methods.push(
        `def ${fn}(${['client: httpx.Client', ...args].join(', ')})${responseType ? ` -> ${responseType}` : ' -> None'}:`,
        `    response = client.request(`,
        `        "${endpoint.method}",`,
        `        f"${pathExpr}",`,
        query ? `        params={${query}},` : '',
        headers ? `        headers={${headers}},` : '',
        requestType ? '        json=payload.to_dict(),' : '',
        '    )',
        '    response.raise_for_status()',
        responseType
          ? `    if response.status_code == 204:\n        raise ValueError("Unexpected empty response")\n    return ${responseType}.from_dict(response.json())`
          : '    return None',
        '',
      );
    }

    files.push({
      filename: safePath(`api/${folder}/models.py`),
      language: 'python',
      content: renderPythonModels(modelSets.length ? modelSets : [emptyObjectResponse()]),
    });

    const modelImports = [
      ...new Set(modelSets.flatMap((m) => m.definitions.map((d) => d.name))),
    ];
    files.push({
      filename: safePath(`api/${folder}/api.py`),
      language: 'python',
      content: [
        'from __future__ import annotations',
        '',
        'import httpx',
        '',
        modelImports.length ? `from .models import ${modelImports.join(', ')}` : '',
        '',
        ...methods,
      ]
        .filter((line) => line !== undefined)
        .join('\n'),
    });
  }

  files.push({
    filename: safePath('api/__init__.py'),
    language: 'python',
    content: '"""Generated ApiCaptain OpenAPI client."""\n',
  });

  return files;
};

export interface GenerateFromOpenApiInput {
  specification: ApiSpecification;
  endpointIds?: string[] | 'all';
  framework: ApiFramework;
  library?: OpenApiLibrary | HttpLibrary;
  baseUrlOverride?: string;
}

export const generateFromOpenApi = (input: GenerateFromOpenApiInput): OpenApiGenerateData => {
  const endpoints = selectEndpoints(input.specification, input.endpointIds);
  if (endpoints.length === 0) {
    throw new Error('No endpoints selected for generation');
  }

  const library = defaultLibrary(input.framework, input.library);
  const baseUrl = input.baseUrlOverride?.trim() || input.specification.baseUrl || '';

  let files: GeneratedFile[];
  switch (input.framework) {
    case 'react-native':
      files = generateReactNative(
        input.specification,
        endpoints,
        library === 'fetch' ? 'fetch' : 'axios',
        baseUrl,
      );
      break;
    case 'flutter':
      files = generateFlutter(input.specification, endpoints, baseUrl);
      break;
    case 'swiftui':
      files = generateSwift(input.specification, endpoints, baseUrl);
      break;
    case 'android':
      files = generateKotlin(input.specification, endpoints, baseUrl);
      break;
    case 'python':
      files = generatePython(input.specification, endpoints, baseUrl);
      break;
    default:
      throw new Error(`Unsupported framework: ${input.framework}`);
  }

  // Deduplicate filenames safely
  const seen = new Set<string>();
  files = files.map((file) => {
    let name = safePath(file.filename);
    if (seen.has(name)) {
      const parts = name.split('.');
      const ext = parts.length > 1 ? `.${parts.pop()}` : '';
      const base = parts.join('.') || 'file';
      let i = 2;
      while (seen.has(`${base}${i}${ext}`)) i += 1;
      name = `${base}${i}${ext}`;
    }
    seen.add(name);
    return { ...file, filename: name };
  });

  return {
    files,
    meta: {
      framework: input.framework,
      library,
      endpointCount: endpoints.length,
      title: input.specification.title,
      baseUrl,
    },
  };
};

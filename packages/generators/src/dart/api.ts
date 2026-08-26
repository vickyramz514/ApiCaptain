import type { NormalizedGenerationInput } from '../shared/schema.js';
import { toSnakeCase } from '../shared/naming.js';

export const renderDartApi = (input: NormalizedGenerationInput): string => {
  const modelsImport = `${toSnakeCase(input.baseName)}_models.dart`;
  const path = input.endpoint.startsWith('/') ? input.endpoint : `/${input.endpoint}`;
  const hasBody = Boolean(input.request);
  const requestType = input.request?.rootName;
  const responseType = input.response.rootName;

  const lines = [
    `import 'dart:convert';`,
    `import 'package:http/http.dart' as http;`,
    `import '${modelsImport}';`,
    '',
    `const String baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: '');`,
    '',
  ];

  if (hasBody && requestType) {
    lines.push(
      `Future<${responseType}> ${input.functionName}(${requestType} payload) async {`,
      `  final response = await http.${input.method.toLowerCase()}(`,
      `    Uri.parse('\$baseUrl${path}'),`,
      `    headers: {'Content-Type': 'application/json'},`,
      `    body: jsonEncode(payload.toJson()),`,
      `  );`,
      '',
      `  if (response.statusCode < 200 || response.statusCode >= 300) {`,
      `    throw Exception('Request failed with status \${response.statusCode}');`,
      `  }`,
      '',
      `  return ${responseType}.fromJson(jsonDecode(response.body) as Map<String, dynamic>);`,
      `}`,
      '',
    );
  } else {
    lines.push(
      `Future<${responseType}> ${input.functionName}() async {`,
      `  final response = await http.${input.method.toLowerCase()}(Uri.parse('\$baseUrl${path}'));`,
      '',
      `  if (response.statusCode < 200 || response.statusCode >= 300) {`,
      `    throw Exception('Request failed with status \${response.statusCode}');`,
      `  }`,
      '',
      `  return ${responseType}.fromJson(jsonDecode(response.body) as Map<String, dynamic>);`,
      `}`,
      '',
    );
  }

  return lines.join('\n');
};

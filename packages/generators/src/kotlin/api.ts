import type { NormalizedGenerationInput } from '../shared/schema.js';

export const renderKotlinApi = (input: NormalizedGenerationInput): string => {
  const path = input.endpoint.startsWith('/') ? input.endpoint : `/${input.endpoint}`;
  const hasBody = Boolean(input.request);
  const requestType = input.request?.rootName;
  const responseType = input.response.rootName;

  const lines = [
    'import java.net.URI',
    'import java.net.http.HttpClient',
    'import java.net.http.HttpRequest',
    'import java.net.http.HttpResponse',
    'import kotlinx.serialization.decodeFromString',
    'import kotlinx.serialization.encodeToString',
    'import kotlinx.serialization.json.Json',
    '',
    'object ApiCaptainConfig {',
    '    var baseUrl: String = System.getenv("API_BASE_URL") ?: ""',
    '}',
    '',
    'private val httpClient = HttpClient.newHttpClient()',
    'private val json = Json { ignoreUnknownKeys = true }',
    '',
  ];

  if (hasBody && requestType) {
    lines.push(
      `suspend fun ${input.functionName}(payload: ${requestType}): ${responseType} {`,
      `    val request = HttpRequest.newBuilder()`,
      `        .uri(URI.create(ApiCaptainConfig.baseUrl + "${path}"))`,
      `        .header("Content-Type", "application/json")`,
      `        .method("${input.method}", HttpRequest.BodyPublishers.ofString(json.encodeToString(payload)))`,
      `        .build()`,
      '',
      `    val response = httpClient.send(request, HttpResponse.BodyHandlers.ofString())`,
      `    if (response.statusCode() !in 200..299) {`,
      `        error("Request failed with status \${response.statusCode()}")")`,
      `    }`,
      '',
      `    return json.decodeFromString<${responseType}>(response.body())`,
      `}`,
      '',
    );
  } else {
    lines.push(
      `suspend fun ${input.functionName}(): ${responseType} {`,
      `    val request = HttpRequest.newBuilder()`,
      `        .uri(URI.create(ApiCaptainConfig.baseUrl + "${path}"))`,
      `        .method("${input.method}", HttpRequest.BodyPublishers.noBody())`,
      `        .build()`,
      '',
      `    val response = httpClient.send(request, HttpResponse.BodyHandlers.ofString())`,
      `    if (response.statusCode() !in 200..299) {`,
      `        error("Request failed with status \${response.statusCode()}")")`,
      `    }`,
      '',
      `    return json.decodeFromString<${responseType}>(response.body())`,
      `}`,
      '',
    );
  }

  return lines.join('\n');
};

import type { NormalizedGenerationInput } from '../shared/schema.js';

export const renderSwiftApi = (input: NormalizedGenerationInput): string => {
  const path = input.endpoint.startsWith('/') ? input.endpoint : `/${input.endpoint}`;
  const hasBody = Boolean(input.request);
  const requestType = input.request?.rootName;
  const responseType = input.response.rootName;

  const lines = [
    'import Foundation',
    '',
    'enum ApiCaptainConfig {',
    '    static var baseURL = ProcessInfo.processInfo.environment["API_BASE_URL"] ?? ""',
    '}',
    '',
  ];

  if (hasBody && requestType) {
    lines.push(
      `func ${input.functionName}(_ payload: ${requestType}) async throws -> ${responseType} {`,
      `    guard let url = URL(string: ApiCaptainConfig.baseURL + "${path}") else {`,
      `        throw URLError(.badURL)`,
      `    }`,
      '',
      `    var request = URLRequest(url: url)`,
      `    request.httpMethod = "${input.method}"`,
      `    request.setValue("application/json", forHTTPHeaderField: "Content-Type")`,
      `    request.httpBody = try JSONEncoder().encode(payload)`,
      '',
      `    let (data, response) = try await URLSession.shared.data(for: request)`,
      `    guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {`,
      `        throw URLError(.badServerResponse)`,
      `    }`,
      '',
      `    return try JSONDecoder().decode(${responseType}.self, from: data)`,
      `}`,
      '',
    );
  } else {
    lines.push(
      `func ${input.functionName}() async throws -> ${responseType} {`,
      `    guard let url = URL(string: ApiCaptainConfig.baseURL + "${path}") else {`,
      `        throw URLError(.badURL)`,
      `    }`,
      '',
      `    var request = URLRequest(url: url)`,
      `    request.httpMethod = "${input.method}"`,
      '',
      `    let (data, response) = try await URLSession.shared.data(for: request)`,
      `    guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {`,
      `        throw URLError(.badServerResponse)`,
      `    }`,
      '',
      `    return try JSONDecoder().decode(${responseType}.self, from: data)`,
      `}`,
      '',
    );
  }

  return lines.join('\n');
};

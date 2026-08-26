# ApiCaptain Phase 4

OpenAPI / Swagger → production-ready multi-language API clients.

## Supported versions & formats

| Spec | Formats |
|------|---------|
| OpenAPI 3.0 | JSON, YAML |
| OpenAPI 3.1 | JSON, YAML |
| Swagger 2.0 | JSON, YAML |

## Architecture

```
OpenAPI input
   ↓
packages/openapi (parse → resolve $ref → normalize)
   ↓
ApiSpecification (framework-independent)
   ↓
packages/generators/openapi (registry by framework/library)
   ↓
GeneratedFile[]
```

- Parsing lives only in `@apicaptain/openapi`
- Generators never parse raw OpenAPI
- Parse once per request; generate from the normalized model

## Normalized model

`ApiSpecification` includes title, version, baseUrl/servers, authentication schemes, tags, component schemas, and endpoints (method, path, operationId, parameters, requestBody, responses).

## $ref resolution

- Local pointers only (`#/components/schemas/...`, `#/definitions/...`)
- Nested refs supported
- Circular refs detected and stubbed (`circular: true`) — no infinite recursion
- Missing refs → `UNRESOLVED_REFERENCE`

## URL import security

`POST /api/v1/openapi/import-url`

- http/https only
- Blocks localhost, private/link-local/metadata IPs
- DNS resolution checked before fetch
- Redirects re-validated
- Timeout + response size limits
- Errors mapped to safe codes (`SSRF_BLOCKED`, `URL_FETCH_FAILED`, …)

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/openapi/parse` | Parse pasted/uploaded content |
| POST | `/api/v1/openapi/import-url` | Secure remote import |
| POST | `/api/v1/openapi/generate` | Generate client from normalized spec |

## Generation targets

| Framework | Library |
|-----------|---------|
| React Native | Axios, Fetch |
| Flutter | Dio |
| SwiftUI | URLSession |
| Android | Retrofit |
| Python | httpx |

Files are grouped by OpenAPI tags (e.g. `api/users/users.api.ts`). Shared `client` + auth config included where appropriate. Base URL comes from `servers[0]` / Swagger host+basePath and remains configurable.

## Frontend

`/openapi-generator`

- Upload / Paste / URL tabs
- Endpoint explorer with search, tags, select all/clear
- Generate selected or entire API
- Monaco file viewer + copy / download / ZIP

## Database

`Generation` model extended with `sourceType`, `sourceName`, `specVersion`, `framework`, `library`, `endpointCount`, `metadata` for future saved projects. Phase 4 does **not** auto-persist uploads.

## Testing

- Parser fixtures: OpenAPI 3.0 YAML, 3.1 YAML, Swagger 2.0 JSON
- $ref / circular / missing / SSRF tests
- Multi-framework generation from `example-api.yaml`
- API route tests for parse + generate + SSRF

## Out of scope (later phases)

Auth UI, billing, saved projects UI, AI, CLI, VS Code extension, Java/C#/Go/Rust generators.

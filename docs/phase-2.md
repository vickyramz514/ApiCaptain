# ApiCaptain Phase 2

React Native API code generation from HTTP method + endpoint + request/response JSON.

## Goal

Upgrade from JSON → TypeScript into production-ready React Native API files:

- `[name].types.ts`
- `[name].api.ts`

## Architecture

```
apps/web
  → POST /api/v1/generate/api-code
apps/api
  → packages/generators (api-code)
  → packages/types
```

Phase 1 endpoint remains:

- `POST /api/v1/generate/typescript`

Generator clients are registered in:

`packages/generators/src/api-code/clients/`

Supported now:

- Axios
- Fetch

Designed so React Query / Zod / OpenAPI can register later without redesign.

## Request

```json
{
  "method": "POST",
  "endpoint": "/api/login",
  "framework": "react-native",
  "library": "axios",
  "requestJson": { "email": "john@test.com", "password": "123456" },
  "responseJson": {
    "token": "abc123",
    "user": { "id": 1, "name": "John", "email": "john@test.com" }
  }
}
```

## Response

```json
{
  "success": true,
  "data": {
    "files": [
      { "filename": "login.types.ts", "content": "...", "language": "typescript" },
      { "filename": "login.api.ts", "content": "...", "language": "typescript" }
    ],
    "meta": {
      "baseName": "login",
      "functionName": "login",
      "requestTypeName": "LoginRequest",
      "responseTypeName": "LoginResponse",
      "method": "POST",
      "endpoint": "/api/login",
      "framework": "react-native",
      "library": "axios"
    }
  }
}
```

## Rules

- GET/DELETE: request body optional
- POST/PUT/PATCH: request body required
- Endpoint must start with `/`
- Framework Phase 2: `react-native` only
- Libraries Phase 2: `axios` | `fetch`

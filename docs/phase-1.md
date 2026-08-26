# ApiCaptain Phase 1

JSON → TypeScript interface/type generator.

## Architecture

```
apps/web  →  packages/types
apps/api  →  packages/types + packages/generators
packages/generators  (framework-independent)
apps/api/prisma      (PostgreSQL schema for future SaaS)
```

- Frontend validates JSON, then calls `POST /api/v1/generate/typescript`.
- Backend validates the request and delegates generation to `@apicaptain/generators`.
- Generator logic must never live in Express controllers or React components.

## Database models

| Model | Purpose in Phase 1 |
|-------|--------------------|
| `User` | Future auth (unused now) |
| `Project` | Future saved workspaces |
| `Generation` | Optional history (`userId` / `projectId` nullable). Anonymous runs are **not** auto-saved. |

## API contract

### `GET /health`

```json
{ "success": true, "message": "ApiCaptain API is running", "data": { "message": "ApiCaptain API is running" } }
```

### `POST /api/v1/generate/typescript`

Request:

```json
{
  "json": { "id": 1, "name": "John" },
  "rootName": "User",
  "outputType": "interface",
  "optionalProperties": false,
  "useSemicolon": true,
  "exportTypes": true
}
```

Success:

```json
{ "success": true, "data": { "code": "export interface User { ... }" } }
```

Error:

```json
{ "success": false, "error": { "code": "INVALID_OPTIONS", "message": "..." } }
```

## Generator behavior

- Infers `string`, `number`, `boolean`, `null`, objects, arrays, nested structures.
- Creates nested named types and deduplicates identical shapes.
- Quotes invalid property identifiers (`user-name`, `first name`, `123name`).
- Supports interface vs type, optional properties, semicolons, and `export`.
- Deterministic for the same input + options.

## Future expansion (not implemented)

- Phase 2: React Native Axios / Fetch API code generation (implemented)
- Phase 3: React Query / OpenAPI / saved projects
- Phase 4: Auth / subscriptions / usage limits
- Phase 5: AI / teams / workspaces

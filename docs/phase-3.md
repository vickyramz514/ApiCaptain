# ApiCaptain Phase 3

Multi-language API code generation.

## Supported frameworks

| Framework UI | Language pack | Output |
|--------------|---------------|--------|
| React Native | TypeScript (Phase 2) | `.types.ts` + `.api.ts` (Axios/Fetch) |
| Flutter | Dart | `_models.dart` + `_api.dart` |
| SwiftUI | Swift | `Models.swift` + `API.swift` |
| Android | Kotlin | `Models.kt` + `Api.kt` |
| Python | Python | `_models.py` + `_api.py` |

## Architecture

```
packages/generators/
  shared/     # contract + normalized JSON schema
  typescript/ # Phase 1
  api-code/   # Phase 2 RN Axios/Fetch
  dart/
  swift/
  kotlin/
  python/
  registry.ts # framework → generator
```

Shared contract:

```ts
interface CodeGenerator {
  id: string;
  language: GeneratedLanguage;
  generate(input: NormalizedGenerationInput): GeneratedFile[];
}
```

JSON is normalized once via `normalizeJsonModels` — language packs do not re-parse JSON independently.

## API

`POST /api/v1/generate/api-code`

```json
{
  "method": "POST",
  "endpoint": "/api/login",
  "framework": "flutter",
  "rootName": "Login",
  "requestJson": { "email": "a", "password": "b" },
  "responseJson": { "token": "x", "user": { "id": 1 } }
}
```

For `react-native`, `library` remains required (`axios` | `fetch`).

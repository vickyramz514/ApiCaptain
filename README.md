# ApiCaptain

**Turn APIs into production-ready code.**

ApiCaptain generates production-ready API models and clients from:

1. JSON samples → TypeScript (Phase 1)
2. Method + endpoint + JSON → multi-language clients (Phases 2–3)
3. **OpenAPI / Swagger → structured multi-file API clients (Phase 4)**

## Monorepo architecture

```
ApiCaptain/
├── apps/
│   ├── web/                 # Next.js UI (Monaco editors)
│   └── api/                 # Express REST API + Prisma
├── packages/
│   ├── types/               # Shared request/response contracts
│   ├── config/              # Shared env/config helpers
│   ├── openapi/             # OpenAPI/Swagger parse + normalize
│   └── generators/          # Language generators (framework-independent)
├── docs/
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

Dependency direction:

- `apps/web` → `@apicaptain/types`
- `apps/api` → `@apicaptain/types` + `@apicaptain/generators` + `@apicaptain/openapi`
- `@apicaptain/generators` → `@apicaptain/types` + `@apicaptain/openapi`
- Generators have **no** dependency on Next.js, Express, React, or the database

## Local setup

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:migrate   # when PostgreSQL is available
pnpm dev
```

- Web: http://localhost:3000
- OpenAPI UI: http://localhost:3000/openapi-generator
- API: http://localhost:4000

## API

| Endpoint | Phase |
|----------|-------|
| `GET /health` | — |
| `POST /api/v1/generate/typescript` | 1 |
| `POST /api/v1/generate/api-code` | 2–3 |
| `POST /api/v1/openapi/parse` | 4 |
| `POST /api/v1/openapi/import-url` | 4 |
| `POST /api/v1/openapi/generate` | 4 |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start API + web |
| `pnpm build` | Build all packages/apps |
| `pnpm typecheck` | TypeScript checks |
| `pnpm lint` | Lint (tsc-based) |
| `pnpm test` | Unit + API tests |
| `pnpm db:migrate` | Apply migrations |

## Documentation

- [Phase 1](./docs/phase-1.md) — JSON → TypeScript
- [Phase 2](./docs/phase-2.md) — React Native Axios/Fetch
- [Phase 3](./docs/phase-3.md) — Dart / Swift / Kotlin / Python
- [Phase 4](./docs/phase-4.md) — OpenAPI / Swagger → clients

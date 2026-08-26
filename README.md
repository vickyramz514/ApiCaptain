# ApiCaptain

**Turn APIs into production-ready code.**

ApiCaptain converts API JSON responses into clean TypeScript interfaces and types.

## Monorepo architecture

```
ApiCaptain/
├── apps/
│   ├── web/                 # Next.js UI (Monaco editors)
│   └── api/                 # Express REST API + Prisma
├── packages/
│   ├── types/               # Shared request/response contracts
│   ├── config/              # Shared env/config helpers
│   └── generators/          # JSON → TypeScript generator
├── docs/phase-1.md
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

Dependency direction:

- `apps/web` → `@apicaptain/types`
- `apps/api` → `@apicaptain/types` + `@apicaptain/generators`
- `@apicaptain/generators` has **no** dependency on Next.js, Express, React, or the database

## Tech stack

- pnpm workspaces + Turborepo
- TypeScript everywhere
- Next.js + Tailwind CSS + Monaco Editor
- Node.js + Express
- PostgreSQL + Prisma
- Node.js native test runner

## Local setup

```bash
pnpm install
cp .env.example .env
```

### Database

1. Start PostgreSQL locally.
2. Set `DATABASE_URL` in `.env`.
3. Apply migrations and generate the Prisma client:

```bash
pnpm db:generate
pnpm db:migrate
```

Phase 1 generation does **not** require writing to the database. Prisma is ready for future auth/projects/history.

### Development

```bash
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000

## Environment variables

See `.env.example`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `API_PORT` | API port (default `4000`) |
| `CORS_ORIGIN` | Allowed browser origin |
| `NEXT_PUBLIC_API_URL` | Browser-facing API base URL |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for SEO |

## API

### Health

`GET /health`

### Generate TypeScript

`POST /api/v1/generate/typescript`

```bash
curl -s http://localhost:4000/api/v1/generate/typescript \
  -H 'content-type: application/json' \
  -d '{
    "json": {"id":1,"name":"John","profile":{"city":"Chennai"},"tags":["react","react-native"]},
    "rootName":"User",
    "outputType":"interface",
    "optionalProperties":false,
    "exportTypes":true,
    "useSemicolon":true
  }'
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start API + web |
| `pnpm build` | Build all packages/apps |
| `pnpm typecheck` | TypeScript checks |
| `pnpm lint` | Lint (tsc-based) |
| `pnpm test` | Unit + API tests |
| `pnpm db:generate` | Prisma client generate |
| `pnpm db:migrate` | Apply migrations |

## Documentation

- [Phase 1 details](./docs/phase-1.md)

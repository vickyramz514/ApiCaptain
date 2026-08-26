# ApiCaptain

Production-ready monorepo for ApiCaptain — a platform for API exploration, JSON schema tooling, and code generation.

## Structure

```
ApiCaptain/
├── apps/
│   ├── web/          # Next.js frontend (independently deployable)
│   └── api/          # Express backend (independently deployable)
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── config/       # Shared configuration helpers
│   └── generators/   # JSON → TypeScript / Zod / code generation
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.json
```

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io) 9+ (repo pinned via `packageManager`)

## Getting started

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Run all apps in development (web :3000, api :4000)
pnpm dev

# Build all packages and apps
pnpm build

# Typecheck the workspace
pnpm typecheck

# Lint
pnpm lint

# Test
pnpm test
```

## Workspace packages

| Package | Name | Purpose |
|---------|------|---------|
| `apps/web` | `@apicaptain/web` | Next.js + Tailwind UI |
| `apps/api` | `@apicaptain/api` | Express REST API |
| `packages/types` | `@apicaptain/types` | Shared API contracts |
| `packages/config` | `@apicaptain/config` | Shared config / env helpers |
| `packages/generators` | `@apicaptain/generators` | Codegen utilities |

Apps depend on packages via the `workspace:*` protocol.

## Independent deployment

- **Web**: deploy `apps/web` (e.g. Vercel). Set `NEXT_PUBLIC_API_URL` to your API origin.
- **API**: deploy `apps/api` (e.g. Railway, Render, Fly.io, container). Set `API_PORT`, `CORS_ORIGIN`.

```bash
# Build only the API
pnpm --filter @apicaptain/api build

# Build only the web app
pnpm --filter @apicaptain/web build
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start all apps in watch mode via Turborepo |
| `pnpm build` | Build packages then apps |
| `pnpm typecheck` | Run TypeScript checks across the workspace |
| `pnpm lint` | Lint all packages |
| `pnpm test` | Run package tests |

## License

Private — All rights reserved.

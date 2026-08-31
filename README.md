# ApiCaptain

**Turn APIs into production-ready code.**

ApiCaptain is a multi-language API code generator with OpenAPI support, accounts, and Razorpay-powered Pro billing.

## Features

1. JSON → TypeScript
2. Endpoint JSON → React Native / Flutter / Swift / Kotlin / Python
3. OpenAPI / Swagger → structured clients
4. Accounts, dashboard, saved projects, usage limits
5. **Pro billing (₹499/month) via Razorpay** — checkout, webhooks, cancel-at-period-end
6. Google Sign-In (same OAuth client as DataCaptain)

## Quick start

```bash
pnpm install
cp .env.example .env
# set DATABASE_URL, AUTH_SECRET, Google client, and Razorpay test keys (see docs/phase-6.md)
pnpm db:generate
pnpm db:migrate
pnpm dev
```

- Web: http://localhost:3000
- Dashboard: http://localhost:3000/dashboard
- OpenAPI: http://localhost:3000/openapi-generator
- API: http://localhost:4000

For tests without Postgres, the API uses `SAAS_STORE=memory` automatically in the test script.

## Documentation

- [Phase 1](./docs/phase-1.md) — JSON → TypeScript
- [Phase 2](./docs/phase-2.md) — React Native Axios/Fetch
- [Phase 3](./docs/phase-3.md) — Multi-language
- [Phase 4](./docs/phase-4.md) — OpenAPI / Swagger
- [Phase 5](./docs/phase-5.md) — SaaS foundations
- [Phase 6](./docs/phase-6.md) — Razorpay subscriptions & billing

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start API + web |
| `pnpm build` | Build all |
| `pnpm test` | Unit + API tests |
| `pnpm db:migrate` | Apply migrations |

# ApiCaptain Phase 5

SaaS foundations: accounts, projects, usage limits, and Pro plan architecture.

## Authentication

Email/password with bcrypt hashing and opaque session tokens.

| Method | Path |
|--------|------|
| POST | `/api/v1/auth/register` |
| POST | `/api/v1/auth/login` |
| POST | `/api/v1/auth/logout` |
| POST | `/api/v1/auth/forgot-password` |
| POST | `/api/v1/auth/reset-password` |
| GET | `/api/v1/auth/me` |
| DELETE | `/api/v1/account` |

Sessions are stored hashed server-side. Clients send `Authorization: Bearer <token>` (also httpOnly cookie).

Password resets use `EmailService` (dev logs the link; production is provider-ready, no provider wired yet).

## Plans & entitlements

Centralized in `@apicaptain/config`:

- `PLAN_LIMITS`
- `PLAN_FEATURES`
- `PRICING_PLANS`
- `canUseFeature(plan, feature)`

| Plan | Generations/month | Projects | Max OpenAPI |
|------|-------------------|----------|-------------|
| FREE | 50 | 5 | 10MB / 1000 endpoints |
| PRO | Unlimited | Unlimited | 50MB / 5000 endpoints |

Anonymous public tools (Phase 1–4) remain unlimited. Authenticated FREE users are usage-gated on successful generation.

## Projects

| Method | Path |
|--------|------|
| GET | `/api/v1/dashboard` |
| POST | `/api/v1/projects` |
| GET | `/api/v1/projects` |
| GET | `/api/v1/projects/:id` |
| PATCH | `/api/v1/projects/:id` |
| DELETE | `/api/v1/projects/:id` |
| GET | `/api/v1/projects/:id/history` |
| POST | `/api/v1/projects/:id/generate` |

All project queries are scoped by `userId` (IDOR-safe).

## Database

Models: `User`, `Session`, `PasswordResetToken`, `Project`, `Generation`, `UsageRecord`, `Subscription`.

Migration: `apps/api/prisma/migrations/20260826190000_phase5_saas`

Apply with:

```bash
pnpm db:migrate
```

## Store modes

- Production: Prisma/PostgreSQL (`SAAS_STORE` unset)
- Tests: in-memory (`SAAS_STORE=memory`)

## Web routes

- `/login`, `/register`, `/forgot-password`, `/reset-password`
- `/dashboard`, `/projects`, `/projects/:id`
- `/settings`, `/pricing`

Public tools stay available without login. Save Project prompts account creation and restores draft after register.

## Payments

Phase 6 implements Razorpay checkout, webhooks, and subscription lifecycle. See [phase-6.md](./phase-6.md).

## Security notes

- Never returns `passwordHash`
- Reset tokens hashed; not returned in production responses
- Rate limits on auth endpoints
- Cascade delete on account removal

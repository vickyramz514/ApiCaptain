# ApiCaptain Phase 5

SaaS foundations: accounts, projects, usage limits, and Pro plan architecture.

## Authentication

Email/password with bcrypt hashing and opaque session tokens, plus Google Sign-In (GIS ID token) using the same OAuth client as DataCaptain.

| Method | Path |
|--------|------|
| POST | `/api/v1/auth/register` |
| POST | `/api/v1/auth/login` |
| POST | `/api/v1/auth/google` |
| POST | `/api/v1/auth/logout` |
| POST | `/api/v1/auth/forgot-password` |
| POST | `/api/v1/auth/reset-password` |
| GET | `/api/v1/auth/me` |
| DELETE | `/api/v1/account` |

Sessions are stored hashed server-side. Clients send `Authorization: Bearer <token>` (also httpOnly cookie).

Google Sign-In (`POST /api/v1/auth/google` with `{ credential }`) verifies a Google ID token with `google-auth-library` (`audience` = `GOOGLE_CLIENT_ID`). New Google users are created as FREE accounts with no password. Password login of Google-only users returns “Please sign in with Google”. Email register of an existing Google-only account returns the same guidance.

Add this site’s origin to the shared Google OAuth client’s **Authorized JavaScript origins** (`http://localhost:3000` and the production site URL).

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

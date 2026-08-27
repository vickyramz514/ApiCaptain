# ApiCaptain Phase 6

Real Razorpay subscriptions for ApiCaptain Pro (₹499/month).

## What this phase adds

- Provider-agnostic billing package (`@apicaptain/billing`) with a Razorpay implementation
- Pro checkout, payment signature verification, and webhook processing
- Subscription activation, renewal, past-due, cancellation, and expiration
- Billing page, pricing CTAs, and usage-limit upgrade prompts
- Entitlements still come from Phase 5 `PLAN_LIMITS` / `PLAN_FEATURES`

Stripe is **not** implemented. The `PaymentProvider` interface is the extension point.

## Plans

Centralized in `@apicaptain/config`:

| | FREE | PRO |
|---|---|---|
| Price | ₹0/month | ₹499/month (49900 paise) |
| Generations | 50/month | Unlimited |
| Projects | 5 | Unlimited |
| OpenAPI | 10MB / 1000 endpoints | 50MB / 5000 endpoints |

Do not duplicate these numbers. UI and APIs read `PRO_MONTHLY_PRICE_INR` / `PRO_MONTHLY_AMOUNT_PAISE` / `PLAN_LIMITS`.

Effective plan is derived from subscription status via `getEffectivePlan` / `hasActiveEntitlement`. Do not trust `user.plan === PRO` if the subscription is expired.

| Status | Access |
|---|---|
| ACTIVE / TRIALING | PRO |
| PAST_DUE (grace / Razorpay `pending` or `halted` in-period) | PRO |
| CANCELLED with `currentPeriodEnd` in the future | PRO until period end |
| EXPIRED / INACTIVE | FREE |

## Payment flow

```
User → /pricing → Upgrade to Pro
  → POST /api/v1/billing/subscribe
  → Razorpay Checkout (public key only)
  → POST /api/v1/billing/verify (HMAC of payment_id|subscription_id)
  → Subscription ACTIVE / user PRO
  → Razorpay webhooks confirm and renew state
```

Frontend success is never enough. The backend verifies the checkout signature and/or webhook payload.

## APIs

All except the webhook require authentication.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/billing` | Current plan, status, period |
| GET | `/api/v1/billing/payments` | Payment history for the caller |
| POST | `/api/v1/billing/subscribe` | Create/reuse Razorpay subscription + checkout key |
| POST | `/api/v1/billing/verify` | Verify checkout signature, activate PRO |
| POST | `/api/v1/billing/cancel` | Cancel at period end (default) |
| POST | `/api/v1/billing/reactivate` | Resume **paused** subscriptions only |
| POST | `/api/v1/billing/webhook/razorpay` | Raw-body webhook |

`RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are never returned.

## Webhooks

Mounted **before** `express.json()` so signature verification uses the exact raw body.

Header: `X-Razorpay-Signature`  
HMAC-SHA256(rawBody, `RAZORPAY_WEBHOOK_SECRET`)

`WebhookEvent.eventId` is unique per provider. Duplicates return 200 without re-applying business logic. Failures are not marked processed so Razorpay can retry.

Handled events (Razorpay subscription webhook names):

- `subscription.authenticated` / `subscription.activated` / `subscription.updated`
- `subscription.charged`
- `subscription.pending` / `subscription.halted`
- `subscription.cancelled`
- `subscription.completed`
- `subscription.paused` / `subscription.resumed`
- `payment.captured` / `payment.authorized` / `payment.failed`

Unknown events are stored and acknowledged.

## Database

Migration: `apps/api/prisma/migrations/20260827120000_phase6_billing`

- `Subscription`: `providerPlanId`, `cancelAtPeriodEnd`, `cancelledAt`, `EXPIRED` status
- `Payment`: integer **paise**, `INR`
- `WebhookEvent`: idempotency (`provider` + `eventId`)

## Razorpay (production)

ApiCaptain uses the **same DataCaptain Razorpay live account**.

- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — DataCaptain live keys (`rzp_live_*`)
- `RAZORPAY_PRO_PLAN_ID=plan_TUqfD25EhbbXAo` — ApiCaptain Pro ₹499/month (do not create a plan per checkout)
- Webhook URL: `https://<api-host>/api/v1/billing/webhook/razorpay`
- Set `RAZORPAY_WEBHOOK_SECRET` to the secret from the live webhook in Razorpay Dashboard
- `BILLING_PROVIDER=razorpay`

Never commit the key secret. Put the same variables on Railway (API service) for production.

## Razorpay test mode

For sandbox only, switch Dashboard to Test Mode and use `rzp_test_*` keys. Local unit tests use `BILLING_PROVIDER=mock` automatically when `NODE_ENV=test` (no network calls).

## Cancellation

Default: cancel at period end. The user stays PRO until `currentPeriodEnd`.

Razorpay does **not** support undoing `cancel_at_cycle_end`. `POST /reactivate` only resumes a **paused** subscription.

## Environment

See `.env.example`:

```
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RAZORPAY_PRO_PLAN_ID=plan_TUqfD25EhbbXAo
APP_URL=http://localhost:3000
```

Never commit real credentials.

## Production checklist

- [ ] DataCaptain Razorpay live account configured
- [ ] Pro plan `plan_TUqfD25EhbbXAo` created
- [ ] Production API keys configured (`rzp_live_*`)
- [ ] Webhook URL configured (`/api/v1/billing/webhook/razorpay`)
- [ ] Webhook secret configured
- [ ] HTTPS enabled
- [ ] Database migrations applied
- [ ] Test payment completed
- [ ] Renewal webhook tested
- [ ] Cancellation tested
- [ ] Failed payment tested
- [ ] Duplicate webhook tested

## Package layout

```
packages/billing/
  providers/razorpay/   # SDK wrapper, signatures, webhook parse
  providers/mock.ts     # tests
  services/             # provider facade
  types/
```

Application code depends on `PaymentProvider`, not Razorpay SDK calls in React or controllers.

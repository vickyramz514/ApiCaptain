-- Phase 6 billing: subscription fields, payments, webhook events

-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable subscriptions
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "providerPlanId" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "subscriptions_providerCustomerId_idx" ON "subscriptions"("providerCustomerId");

CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_provider_providerSubscriptionId_key"
  ON "subscriptions"("provider", "providerSubscriptionId")
  WHERE "providerSubscriptionId" IS NOT NULL;

-- CreateTable payments
CREATE TABLE IF NOT EXISTS "payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "provider" "SubscriptionProvider" NOT NULL DEFAULT 'RAZORPAY',
    "providerPaymentId" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "paymentMethod" TEXT,
    "invoiceUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payments_provider_providerPaymentId_key"
  ON "payments"("provider", "providerPaymentId");
CREATE INDEX IF NOT EXISTS "payments_userId_idx" ON "payments"("userId");
CREATE INDEX IF NOT EXISTS "payments_subscriptionId_idx" ON "payments"("subscriptionId");
CREATE INDEX IF NOT EXISTS "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateTable webhook_events
CREATE TABLE IF NOT EXISTS "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" "SubscriptionProvider" NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_provider_eventId_key"
  ON "webhook_events"("provider", "eventId");
CREATE INDEX IF NOT EXISTS "webhook_events_processed_idx" ON "webhook_events"("processed");
CREATE INDEX IF NOT EXISTS "webhook_events_eventType_idx" ON "webhook_events"("eventType");

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

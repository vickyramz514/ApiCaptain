-- CreateEnum
CREATE TYPE "UserPlan" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'PAST_DUE', 'TRIALING', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SubscriptionProvider" AS ENUM ('NONE', 'RAZORPAY', 'STRIPE');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('SUCCESS', 'FAILED');

-- AlterTable users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "plan" "UserPlan" NOT NULL DEFAULT 'FREE';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

-- Backfill placeholder hash for any pre-existing rows (cannot login until reset)
UPDATE "users" SET "passwordHash" = '$phase5_placeholder$' WHERE "passwordHash" IS NULL;
ALTER TABLE "users" ALTER COLUMN "passwordHash" SET NOT NULL;

-- AlterTable projects
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "sourceType" TEXT NOT NULL DEFAULT 'API';
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "sourceContent" TEXT;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "sourceMeta" JSONB;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "openApiVersion" TEXT;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "framework" TEXT;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "library" TEXT;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "lastGeneratedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "projects_updatedAt_idx" ON "projects"("updatedAt");

-- AlterTable generations
ALTER TABLE "generations" ADD COLUMN IF NOT EXISTS "language" TEXT;
ALTER TABLE "generations" ADD COLUMN IF NOT EXISTS "status" "GenerationStatus" NOT NULL DEFAULT 'SUCCESS';
ALTER TABLE "generations" ADD COLUMN IF NOT EXISTS "durationMs" INTEGER;
ALTER TABLE "generations" ALTER COLUMN "inputJson" SET DEFAULT '{}';
ALTER TABLE "generations" ALTER COLUMN "rootName" SET DEFAULT '';
ALTER TABLE "generations" ALTER COLUMN "outputType" SET DEFAULT '';
ALTER TABLE "generations" ALTER COLUMN "generatedCode" SET DEFAULT '';
CREATE INDEX IF NOT EXISTS "generations_status_idx" ON "generations"("status");

-- CreateTable sessions
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sessions_tokenHash_key" ON "sessions"("tokenHash");
CREATE INDEX IF NOT EXISTS "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX IF NOT EXISTS "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateTable password_reset_tokens
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

-- CreateTable usage_records
CREATE TABLE IF NOT EXISTS "usage_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "generationCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "usage_records_userId_period_key" ON "usage_records"("userId", "period");
CREATE INDEX IF NOT EXISTS "usage_records_userId_idx" ON "usage_records"("userId");

-- CreateTable subscriptions
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "UserPlan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
    "provider" "SubscriptionProvider" NOT NULL DEFAULT 'NONE',
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "subscriptions_userId_idx" ON "subscriptions"("userId");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions"("status");

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

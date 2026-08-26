-- AlterTable
ALTER TABLE "generations" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'json';
ALTER TABLE "generations" ADD COLUMN "sourceName" TEXT;
ALTER TABLE "generations" ADD COLUMN "specVersion" TEXT;
ALTER TABLE "generations" ADD COLUMN "framework" TEXT;
ALTER TABLE "generations" ADD COLUMN "library" TEXT;
ALTER TABLE "generations" ADD COLUMN "endpointCount" INTEGER;
ALTER TABLE "generations" ADD COLUMN "metadata" JSONB;

-- CreateIndex
CREATE INDEX "generations_sourceType_idx" ON "generations"("sourceType");

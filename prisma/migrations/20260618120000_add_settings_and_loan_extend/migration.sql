-- AlterTable: add extension tracking columns to Loan
ALTER TABLE "Loan" ADD COLUMN "extendedCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Loan" ADD COLUMN "originalDueDate" TIMESTAMP(3);

-- CreateTable: Setting (key-value store for app configuration)
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- Seed default settings
INSERT INTO "Setting" ("id", "key", "value", "updatedAt") VALUES
  (gen_random_uuid()::text, 'loan.maxExtends', '1', NOW()),
  (gen_random_uuid()::text, 'loan.allowOverdueExtend', 'false', NOW()),
  (gen_random_uuid()::text, 'loan.extendCharge', '0', NOW());

-- Allow each admin to configure multiple payment providers safely.
DROP INDEX IF EXISTS "PaymentSettings_adminId_key";

ALTER TABLE "PaymentSettings"
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS "webhookUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "webhookSecretRef" TEXT,
  ADD COLUMN IF NOT EXISTS "certificateRef" TEXT,
  ADD COLUMN IF NOT EXISTS "agency" TEXT,
  ADD COLUMN IF NOT EXISTS "accountNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "autoApprove" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentSettings_adminId_provider_key" ON "PaymentSettings"("adminId", "provider");
CREATE INDEX IF NOT EXISTS "PaymentSettings_adminId_idx" ON "PaymentSettings"("adminId");

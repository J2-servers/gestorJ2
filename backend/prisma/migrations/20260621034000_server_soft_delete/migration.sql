ALTER TABLE "Server" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Server_deletedAt_idx" ON "Server"("deletedAt");

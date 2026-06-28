ALTER TABLE "SupportTopic" ADD COLUMN "serverId" TEXT;
ALTER TABLE "SupportLink" ADD COLUMN "serverId" TEXT;

ALTER TABLE "SupportTopic"
  ADD CONSTRAINT "SupportTopic_serverId_fkey"
  FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupportLink"
  ADD CONSTRAINT "SupportLink_serverId_fkey"
  FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "SupportTopic_serverId_status_idx" ON "SupportTopic"("serverId", "status");
CREATE INDEX "SupportLink_serverId_status_idx" ON "SupportLink"("serverId", "status");

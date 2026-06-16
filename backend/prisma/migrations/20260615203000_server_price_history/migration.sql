CREATE TABLE "ServerPriceHistory" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "oldPrice" DECIMAL(12,4),
    "newPrice" DECIMAL(12,4) NOT NULL,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServerPriceHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ServerPriceHistory_serverId_createdAt_idx" ON "ServerPriceHistory"("serverId", "createdAt");
CREATE INDEX "ServerPriceHistory_changedById_idx" ON "ServerPriceHistory"("changedById");

ALTER TABLE "ServerPriceHistory" ADD CONSTRAINT "ServerPriceHistory_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServerPriceHistory" ADD CONSTRAINT "ServerPriceHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'error',
    "statusCode" INTEGER,
    "method" TEXT,
    "path" TEXT,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "context" TEXT,
    "userId" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ErrorLog_resolved_idx" ON "ErrorLog"("resolved");
CREATE INDEX "ErrorLog_createdAt_idx" ON "ErrorLog"("createdAt");
CREATE INDEX "ErrorLog_userId_idx" ON "ErrorLog"("userId");

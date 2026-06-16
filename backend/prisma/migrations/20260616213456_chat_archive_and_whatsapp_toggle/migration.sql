-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ChatArchive" (
    "id" TEXT NOT NULL,
    "resellerId" TEXT NOT NULL,
    "messageCount" INTEGER NOT NULL,
    "fromDate" TIMESTAMP(3),
    "toDate" TIMESTAMP(3),
    "gzipData" BYTEA NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatArchive_resellerId_createdAt_idx" ON "ChatArchive"("resellerId", "createdAt");

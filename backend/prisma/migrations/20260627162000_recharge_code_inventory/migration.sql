-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RechargeCodeStatus') THEN
    CREATE TYPE "RechargeCodeStatus" AS ENUM ('available', 'reserved', 'sold', 'voided');
  END IF;
END
$$;

-- CreateTable
CREATE TABLE "RechargeCodeProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "serverId" TEXT,
    "denomination" INTEGER NOT NULL,
    "costValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saleValue" DECIMAL(12,2) NOT NULL,
    "instructions" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RechargeCodeProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RechargeCodeBatch" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "importedById" TEXT,
    "sourceFilename" TEXT,
    "notes" TEXT,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "invalidCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RechargeCodeBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RechargeCode" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT,
    "code" TEXT NOT NULL,
    "pin" TEXT,
    "serial" TEXT,
    "status" "RechargeCodeStatus" NOT NULL DEFAULT 'available',
    "expiresAt" TIMESTAMP(3),
    "soldToId" TEXT,
    "soldAt" TIMESTAMP(3),
    "reservedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RechargeCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RechargeCodeProduct_active_idx" ON "RechargeCodeProduct"("active");

-- CreateIndex
CREATE INDEX "RechargeCodeProduct_serverId_idx" ON "RechargeCodeProduct"("serverId");

-- CreateIndex
CREATE INDEX "RechargeCodeBatch_productId_createdAt_idx" ON "RechargeCodeBatch"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "RechargeCodeBatch_importedById_idx" ON "RechargeCodeBatch"("importedById");

-- CreateIndex
CREATE UNIQUE INDEX "RechargeCode_code_key" ON "RechargeCode"("code");

-- CreateIndex
CREATE INDEX "RechargeCode_productId_status_idx" ON "RechargeCode"("productId", "status");

-- CreateIndex
CREATE INDEX "RechargeCode_batchId_idx" ON "RechargeCode"("batchId");

-- CreateIndex
CREATE INDEX "RechargeCode_soldToId_idx" ON "RechargeCode"("soldToId");

-- CreateIndex
CREATE INDEX "RechargeCode_createdAt_idx" ON "RechargeCode"("createdAt");

-- AddForeignKey
ALTER TABLE "RechargeCodeProduct" ADD CONSTRAINT "RechargeCodeProduct_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RechargeCodeBatch" ADD CONSTRAINT "RechargeCodeBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "RechargeCodeProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RechargeCodeBatch" ADD CONSTRAINT "RechargeCodeBatch_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RechargeCode" ADD CONSTRAINT "RechargeCode_productId_fkey" FOREIGN KEY ("productId") REFERENCES "RechargeCodeProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RechargeCode" ADD CONSTRAINT "RechargeCode_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "RechargeCodeBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RechargeCode" ADD CONSTRAINT "RechargeCode_soldToId_fkey" FOREIGN KEY ("soldToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


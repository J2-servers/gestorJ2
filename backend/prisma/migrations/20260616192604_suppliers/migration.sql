-- AlterTable
ALTER TABLE "ResellerServer" ADD COLUMN     "supplierId" TEXT;

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "panelLogin" TEXT NOT NULL,
    "panelLink" TEXT,
    "costPerCredit" DECIMAL(12,4) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Supplier_serverId_idx" ON "Supplier"("serverId");

-- CreateIndex
CREATE INDEX "ResellerServer_supplierId_idx" ON "ResellerServer"("supplierId");

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResellerServer" ADD CONSTRAINT "ResellerServer_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

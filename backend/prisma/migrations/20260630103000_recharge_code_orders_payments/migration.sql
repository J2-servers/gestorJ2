CREATE TYPE "RechargeCodeOrderStatus" AS ENUM ('pending_payment', 'paid', 'delivered', 'canceled', 'expired', 'failed');
CREATE TYPE "RechargeCodePaymentStatus" AS ENUM ('pending', 'approved', 'rejected', 'expired');
CREATE TYPE "PaymentEnvironment" AS ENUM ('sandbox', 'production');

ALTER TYPE "RechargeCodeStatus" ADD VALUE IF NOT EXISTS 'cancelled';

CREATE TABLE "PaymentSettings" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'manual_pix',
  "environment" "PaymentEnvironment" NOT NULL DEFAULT 'sandbox',
  "active" BOOLEAN NOT NULL DEFAULT false,
  "pixKey" TEXT,
  "clientId" TEXT,
  "clientSecretRef" TEXT,
  "tokenRef" TEXT,
  "bankName" TEXT,
  "accountLabel" TEXT,
  "publicInfo" JSONB,
  "instructions" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlanModality" (
  "id" TEXT NOT NULL,
  "serverId" TEXT,
  "name" TEXT NOT NULL,
  "durationDays" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlanModality_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RechargeCodeProduct" ADD COLUMN "modalityId" TEXT;
ALTER TABLE "RechargeCode" ADD COLUMN "reservedUntil" TIMESTAMP(3);
ALTER TABLE "RechargeCode" ADD COLUMN "orderItemId" TEXT;

CREATE TABLE "RechargeCodeOrder" (
  "id" TEXT NOT NULL,
  "resellerId" TEXT NOT NULL,
  "status" "RechargeCodeOrderStatus" NOT NULL DEFAULT 'pending_payment',
  "totalValue" DECIMAL(12,2) NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RechargeCodeOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RechargeCodeOrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitValue" DECIMAL(12,2) NOT NULL,
  "totalValue" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RechargeCodeOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RechargeCodePayment" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'manual_pix',
  "status" "RechargeCodePaymentStatus" NOT NULL DEFAULT 'pending',
  "amount" DECIMAL(12,2) NOT NULL,
  "paymentCode" TEXT,
  "proofUrl" TEXT,
  "providerRef" TEXT,
  "instructions" TEXT,
  "expiresAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RechargeCodePayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RechargeCodeDeliveryLog" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "codeId" TEXT,
  "recipientId" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'in_app',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RechargeCodeDeliveryLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentSettings_adminId_key" ON "PaymentSettings"("adminId");
CREATE INDEX "PaymentSettings_active_idx" ON "PaymentSettings"("active");
CREATE UNIQUE INDEX "PlanModality_serverId_name_key" ON "PlanModality"("serverId", "name");
CREATE INDEX "PlanModality_active_idx" ON "PlanModality"("active");
CREATE INDEX "PlanModality_serverId_idx" ON "PlanModality"("serverId");
CREATE INDEX "RechargeCodeProduct_modalityId_idx" ON "RechargeCodeProduct"("modalityId");
CREATE INDEX "RechargeCode_orderItemId_idx" ON "RechargeCode"("orderItemId");
CREATE INDEX "RechargeCodeOrder_resellerId_createdAt_idx" ON "RechargeCodeOrder"("resellerId", "createdAt");
CREATE INDEX "RechargeCodeOrder_status_idx" ON "RechargeCodeOrder"("status");
CREATE INDEX "RechargeCodeOrderItem_orderId_idx" ON "RechargeCodeOrderItem"("orderId");
CREATE INDEX "RechargeCodeOrderItem_productId_idx" ON "RechargeCodeOrderItem"("productId");
CREATE UNIQUE INDEX "RechargeCodePayment_orderId_key" ON "RechargeCodePayment"("orderId");
CREATE INDEX "RechargeCodePayment_status_idx" ON "RechargeCodePayment"("status");
CREATE INDEX "RechargeCodeDeliveryLog_orderId_idx" ON "RechargeCodeDeliveryLog"("orderId");
CREATE INDEX "RechargeCodeDeliveryLog_recipientId_idx" ON "RechargeCodeDeliveryLog"("recipientId");

ALTER TABLE "PaymentSettings" ADD CONSTRAINT "PaymentSettings_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanModality" ADD CONSTRAINT "PlanModality_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RechargeCodeProduct" ADD CONSTRAINT "RechargeCodeProduct_modalityId_fkey" FOREIGN KEY ("modalityId") REFERENCES "PlanModality"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RechargeCode" ADD CONSTRAINT "RechargeCode_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "RechargeCodeOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RechargeCodeOrder" ADD CONSTRAINT "RechargeCodeOrder_resellerId_fkey" FOREIGN KEY ("resellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RechargeCodeOrderItem" ADD CONSTRAINT "RechargeCodeOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RechargeCodeOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RechargeCodeOrderItem" ADD CONSTRAINT "RechargeCodeOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "RechargeCodeProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RechargeCodePayment" ADD CONSTRAINT "RechargeCodePayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RechargeCodeOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RechargeCodeDeliveryLog" ADD CONSTRAINT "RechargeCodeDeliveryLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RechargeCodeOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RechargeCodeDeliveryLog" ADD CONSTRAINT "RechargeCodeDeliveryLog_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

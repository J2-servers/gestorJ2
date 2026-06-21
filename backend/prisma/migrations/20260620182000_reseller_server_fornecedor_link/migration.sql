CREATE TABLE IF NOT EXISTS "Fornecedor" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contact" TEXT,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Fornecedor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Fornecedor_active_idx" ON "Fornecedor"("active");

CREATE TABLE IF NOT EXISTS "ServerFornecedor" (
  "id" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "fornecedorId" TEXT NOT NULL,
  "costPerCredit" DECIMAL(12,4) NOT NULL,
  "panelLogin" TEXT NOT NULL,
  "panelLink" TEXT,
  "panelPassword" TEXT,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServerFornecedor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ServerFornecedor_serverId_fornecedorId_key" ON "ServerFornecedor"("serverId", "fornecedorId");
CREATE INDEX IF NOT EXISTS "ServerFornecedor_serverId_idx" ON "ServerFornecedor"("serverId");
CREATE INDEX IF NOT EXISTS "ServerFornecedor_fornecedorId_idx" ON "ServerFornecedor"("fornecedorId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ServerFornecedor_serverId_fkey'
  ) THEN
    ALTER TABLE "ServerFornecedor"
    ADD CONSTRAINT "ServerFornecedor_serverId_fkey"
    FOREIGN KEY ("serverId") REFERENCES "Server"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ServerFornecedor_fornecedorId_fkey'
  ) THEN
    ALTER TABLE "ServerFornecedor"
    ADD CONSTRAINT "ServerFornecedor_fornecedorId_fkey"
    FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "ResellerServer" ADD COLUMN IF NOT EXISTS "serverFornecedorId" TEXT;

CREATE INDEX IF NOT EXISTS "ResellerServer_serverFornecedorId_idx" ON "ResellerServer"("serverFornecedorId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ResellerServer_serverFornecedorId_fkey'
  ) THEN
    ALTER TABLE "ResellerServer"
    ADD CONSTRAINT "ResellerServer_serverFornecedorId_fkey"
    FOREIGN KEY ("serverFornecedorId") REFERENCES "ServerFornecedor"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

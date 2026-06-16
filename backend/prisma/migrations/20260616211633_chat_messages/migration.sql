-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "resellerId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "readByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "readByReseller" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatMessage_resellerId_createdAt_idx" ON "ChatMessage"("resellerId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_resellerId_fkey" FOREIGN KEY ("resellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

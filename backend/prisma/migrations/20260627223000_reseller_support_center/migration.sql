-- CreateEnum
CREATE TYPE "SupportTopicStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "SupportServerStatus" AS ENUM ('operational', 'attention', 'maintenance', 'degraded', 'offline');

-- CreateTable
CREATE TABLE "SupportTopic" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT,
    "steps" JSONB,
    "status" "SupportTopicStatus" NOT NULL DEFAULT 'published',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "authorId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportLink" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "detail" TEXT,
    "status" "SupportTopicStatus" NOT NULL DEFAULT 'published',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "authorId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportServerUpdate" (
    "id" TEXT NOT NULL,
    "serverId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "SupportServerStatus" NOT NULL DEFAULT 'operational',
    "impact" TEXT,
    "actionText" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "authorId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportServerUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportTopic_status_pinned_sortOrder_idx" ON "SupportTopic"("status", "pinned", "sortOrder");

-- CreateIndex
CREATE INDEX "SupportTopic_category_idx" ON "SupportTopic"("category");

-- CreateIndex
CREATE INDEX "SupportTopic_authorId_idx" ON "SupportTopic"("authorId");

-- CreateIndex
CREATE INDEX "SupportLink_status_pinned_sortOrder_idx" ON "SupportLink"("status", "pinned", "sortOrder");

-- CreateIndex
CREATE INDEX "SupportLink_category_idx" ON "SupportLink"("category");

-- CreateIndex
CREATE INDEX "SupportLink_authorId_idx" ON "SupportLink"("authorId");

-- CreateIndex
CREATE INDEX "SupportServerUpdate_published_pinned_createdAt_idx" ON "SupportServerUpdate"("published", "pinned", "createdAt");

-- CreateIndex
CREATE INDEX "SupportServerUpdate_serverId_createdAt_idx" ON "SupportServerUpdate"("serverId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportServerUpdate_authorId_idx" ON "SupportServerUpdate"("authorId");

-- AddForeignKey
ALTER TABLE "SupportTopic" ADD CONSTRAINT "SupportTopic_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportLink" ADD CONSTRAINT "SupportLink_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportServerUpdate" ADD CONSTRAINT "SupportServerUpdate_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportServerUpdate" ADD CONSTRAINT "SupportServerUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

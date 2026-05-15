-- CreateTable
CREATE TABLE "EmailDigest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'daily_digest',
    "provider" TEXT NOT NULL DEFAULT 'outbox',
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "taskIds" JSONB NOT NULL DEFAULT [],
    "meetingIds" JSONB NOT NULL DEFAULT [],
    "taskCount" INTEGER NOT NULL DEFAULT 0,
    "meetingCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "error" TEXT,
    "providerMessageId" TEXT,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmailDigest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmailDigest_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "interactionId" TEXT,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Comment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "Interaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "EmailDigest_workspaceId_createdAt_idx" ON "EmailDigest"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailDigest_recipientId_createdAt_idx" ON "EmailDigest"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_companyId_createdAt_idx" ON "Comment"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_interactionId_createdAt_idx" ON "Comment"("interactionId", "createdAt");

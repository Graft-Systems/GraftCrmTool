-- CreateTable
CREATE TABLE "WisprConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'demo',
    "externalUserId" TEXT,
    "displayName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'connected',
    "apiKey" TEXT,
    "webhookSecret" TEXT,
    "lastSyncedAt" DATETIME,
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WisprConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WisprIngest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "wisprConnectionId" TEXT NOT NULL,
    "externalNoteId" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawText" TEXT NOT NULL,
    "aiSummary" TEXT,
    "aiNeeds" JSONB NOT NULL DEFAULT [],
    "aiSuggestedTasks" JSONB NOT NULL DEFAULT [],
    "aiStageHint" TEXT,
    "aiTagHints" JSONB NOT NULL DEFAULT [],
    "interactionType" TEXT NOT NULL DEFAULT 'voice_note',
    "suggestedCompanyId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "appliedInteractionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WisprIngest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WisprIngest_wisprConnectionId_fkey" FOREIGN KEY ("wisprConnectionId") REFERENCES "WisprConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WisprIngest_suggestedCompanyId_fkey" FOREIGN KEY ("suggestedCompanyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WisprIngest_appliedInteractionId_fkey" FOREIGN KEY ("appliedInteractionId") REFERENCES "Interaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "WisprConnection_userId_key" ON "WisprConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WisprIngest_appliedInteractionId_key" ON "WisprIngest"("appliedInteractionId");

-- CreateIndex
CREATE INDEX "WisprIngest_workspaceId_status_idx" ON "WisprIngest"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WisprIngest_wisprConnectionId_externalNoteId_key" ON "WisprIngest"("wisprConnectionId", "externalNoteId");

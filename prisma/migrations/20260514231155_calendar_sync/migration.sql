-- CreateTable
CREATE TABLE "CalendarAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'demo',
    "externalAccountId" TEXT,
    "displayName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'connected',
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" DATETIME,
    "syncCursor" TEXT,
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CalendarAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "calendarAccountId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "location" TEXT,
    "meetingUrl" TEXT,
    "organizerEmail" TEXT,
    "attendees" JSONB NOT NULL DEFAULT [],
    "companyId" TEXT,
    "contactId" TEXT,
    "linkStatus" TEXT NOT NULL DEFAULT 'unmatched',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CalendarEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CalendarEvent_calendarAccountId_fkey" FOREIGN KEY ("calendarAccountId") REFERENCES "CalendarAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CalendarEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CalendarEvent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Interaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "contactId" TEXT,
    "type" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "transcript" TEXT,
    "aiSummary" TEXT,
    "aiNeeds" JSONB,
    "aiSuggestedTasks" JSONB,
    "aiStageHint" TEXT,
    "aiTagHints" JSONB,
    "calendarEventId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Interaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Interaction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Interaction_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Interaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Interaction" ("aiNeeds", "aiStageHint", "aiSuggestedTasks", "aiSummary", "aiTagHints", "companyId", "contactId", "createdAt", "createdById", "id", "notes", "occurredAt", "source", "transcript", "type", "updatedAt") SELECT "aiNeeds", "aiStageHint", "aiSuggestedTasks", "aiSummary", "aiTagHints", "companyId", "contactId", "createdAt", "createdById", "id", "notes", "occurredAt", "source", "transcript", "type", "updatedAt" FROM "Interaction";
DROP TABLE "Interaction";
ALTER TABLE "new_Interaction" RENAME TO "Interaction";
CREATE UNIQUE INDEX "Interaction_calendarEventId_key" ON "Interaction"("calendarEventId");
CREATE INDEX "Interaction_companyId_occurredAt_idx" ON "Interaction"("companyId", "occurredAt");
CREATE INDEX "Interaction_contactId_idx" ON "Interaction"("contactId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CalendarAccount_userId_idx" ON "CalendarAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarAccount_userId_provider_externalAccountId_key" ON "CalendarAccount"("userId", "provider", "externalAccountId");

-- CreateIndex
CREATE INDEX "CalendarEvent_workspaceId_startsAt_idx" ON "CalendarEvent"("workspaceId", "startsAt");

-- CreateIndex
CREATE INDEX "CalendarEvent_companyId_idx" ON "CalendarEvent"("companyId");

-- CreateIndex
CREATE INDEX "CalendarEvent_contactId_idx" ON "CalendarEvent"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_calendarAccountId_externalId_key" ON "CalendarEvent"("calendarAccountId", "externalId");

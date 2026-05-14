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
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Interaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Interaction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Interaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Interaction" ("companyId", "contactId", "createdAt", "createdById", "id", "notes", "occurredAt", "type", "updatedAt") SELECT "companyId", "contactId", "createdAt", "createdById", "id", "notes", "occurredAt", "type", "updatedAt" FROM "Interaction";
DROP TABLE "Interaction";
ALTER TABLE "new_Interaction" RENAME TO "Interaction";
CREATE INDEX "Interaction_companyId_occurredAt_idx" ON "Interaction"("companyId", "occurredAt");
CREATE INDEX "Interaction_contactId_idx" ON "Interaction"("contactId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

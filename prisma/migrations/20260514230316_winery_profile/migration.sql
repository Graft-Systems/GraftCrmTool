-- CreateTable
CREATE TABLE "WineryProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "region" TEXT,
    "varietals" JSONB NOT NULL DEFAULT [],
    "annualProductionCases" INTEGER,
    "distributionModel" TEXT,
    "tastingRoomStatus" TEXT,
    "winemakerName" TEXT,
    "established" INTEGER,
    "websiteShop" TEXT,
    "nextStep" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WineryProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "WineryProfile_companyId_key" ON "WineryProfile"("companyId");

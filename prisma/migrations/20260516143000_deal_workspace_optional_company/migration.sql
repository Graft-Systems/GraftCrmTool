-- Deal belongs to workspace; company is optional.

ALTER TABLE "Deal" ADD COLUMN "workspaceId" TEXT;

UPDATE "Deal" AS d
SET "workspaceId" = c."workspaceId"
FROM "Company" AS c
WHERE d."companyId" = c."id";

ALTER TABLE "Deal" ALTER COLUMN "workspaceId" SET NOT NULL;

ALTER TABLE "Deal" DROP CONSTRAINT "Deal_companyId_fkey";

ALTER TABLE "Deal" ALTER COLUMN "companyId" DROP NOT NULL;

ALTER TABLE "Deal" ADD CONSTRAINT "Deal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Deal" ADD CONSTRAINT "Deal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Deal_workspaceId_stage_idx" ON "Deal"("workspaceId", "stage");

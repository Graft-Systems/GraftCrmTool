import Link from "next/link";

import { CompanyFilters } from "@/components/companies/company-filters";
import { CompanyTable } from "@/components/companies/company-table";
import { buttonVariants } from "@/components/ui/button";
import {
  listCompanies,
  listKnownTags,
  listRelationshipStages,
  listWorkspaceUsers,
} from "@/lib/companies/queries";
import { requireSession } from "@/lib/session";

type CompaniesPageProps = {
  searchParams: Promise<{
    q?: string;
    stageId?: string;
    tag?: string;
    ownerId?: string;
    staleDays?: string;
  }>;
};

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  const session = await requireSession();
  const filters = await searchParams;
  const staleDays = filters.staleDays ? Number(filters.staleDays) : undefined;

  const [companies, users, stages, tags] = await Promise.all([
    listCompanies(session.user.workspaceId, {
      q: filters.q,
      stageId: filters.stageId,
      tag: filters.tag,
      ownerId: filters.ownerId,
      staleDays: Number.isFinite(staleDays) ? staleDays : undefined,
    }),
    listWorkspaceUsers(session.user.workspaceId),
    listRelationshipStages(session.user.workspaceId),
    listKnownTags(session.user.workspaceId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Companies</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everyone you&apos;re tracking — stage, tags, owners, and last touch.
          </p>
        </div>
        <Link href="/companies/new" className={buttonVariants()}>
          Add company
        </Link>
      </div>

      <CompanyFilters
        users={users}
        stages={stages}
        tags={tags}
        values={filters}
      />

      <CompanyTable companies={companies} />
    </div>
  );
}

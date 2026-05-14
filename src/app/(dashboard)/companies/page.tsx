import Link from "next/link";

import { CompanyFilters } from "@/components/crm/company-filters";
import { CompanyTable } from "@/components/crm/company-table";
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">The Arena</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Contenders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Orgs you are tracking—stage, tags, owners, and who is in the fight.
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

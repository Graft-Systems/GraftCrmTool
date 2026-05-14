import { PartnerTable } from "@/components/crm/partner-table";
import { PARTNER_PROGRAM_STATUSES } from "@/lib/constants";
import { listWorkspaceUsers } from "@/lib/companies/queries";
import { listPartners } from "@/lib/pipeline/queries";
import { requireSession } from "@/lib/session";
import { cn } from "@/lib/utils";

type PartnersPageProps = {
  searchParams: Promise<{
    programStatus?: string;
    ownerId?: string;
  }>;
};

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

export default async function PartnersPage({ searchParams }: PartnersPageProps) {
  const session = await requireSession();
  const filters = await searchParams;

  const [partners, users] = await Promise.all([
    listPartners(session.user.workspaceId, {
      programStatus: filters.programStatus,
      ownerId: filters.ownerId,
    }),
    listWorkspaceUsers(session.user.workspaceId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Partners</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Partnership programs and integration tracks by company.
        </p>
      </div>

      <form method="get" className="grid gap-4 rounded-xl border bg-background p-4 md:grid-cols-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="programStatus">
            Program status
          </label>
          <select
            id="programStatus"
            name="programStatus"
            defaultValue={filters.programStatus ?? ""}
            className={selectClassName}
          >
            <option value="">All statuses</option>
            {PARTNER_PROGRAM_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="ownerId">
            Owner
          </label>
          <select id="ownerId" name="ownerId" defaultValue={filters.ownerId ?? ""} className={selectClassName}>
            <option value="">All owners</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name ?? user.email}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2 md:col-span-2">
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Apply filters
          </button>
          <a
            href="/partners"
            className="inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium"
          >
            Reset
          </a>
        </div>
      </form>

      <PartnerTable partners={partners} />
    </div>
  );
}

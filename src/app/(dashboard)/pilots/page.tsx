import { PilotTable } from "@/components/crm/pilot-table";
import { PILOT_STATUSES } from "@/lib/constants";
import { listWorkspaceUsers } from "@/lib/companies/queries";
import { listPilots } from "@/lib/pipeline/queries";
import { requireSession } from "@/lib/session";
import { cn } from "@/lib/utils";

type PilotsPageProps = {
  searchParams: Promise<{
    status?: string;
    ownerId?: string;
    activeOnly?: string;
  }>;
};

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

export default async function PilotsPage({ searchParams }: PilotsPageProps) {
  const session = await requireSession();
  const filters = await searchParams;
  const activeOnly = filters.activeOnly !== "0";

  const [pilots, users] = await Promise.all([
    listPilots(session.user.workspaceId, {
      status: filters.status,
      ownerId: filters.ownerId,
      activeOnly: activeOnly && !filters.status,
    }),
    listWorkspaceUsers(session.user.workspaceId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Pilots</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Active and planned evaluations across companies.
        </p>
      </div>

      <form method="get" className="grid gap-4 rounded-xl border bg-background p-4 md:grid-cols-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={filters.status ?? ""} className={selectClassName}>
            <option value="">Active pilots</option>
            {PILOT_STATUSES.map((status) => (
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
          <input type="hidden" name="activeOnly" value={activeOnly ? "1" : "0"} />
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Apply filters
          </button>
          <a
            href="/pilots"
            className="inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium"
          >
            Reset
          </a>
        </div>
      </form>

      <PilotTable pilots={pilots} />
    </div>
  );
}

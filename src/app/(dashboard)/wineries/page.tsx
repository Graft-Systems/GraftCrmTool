import { WineryTable } from "@/components/crm/winery-table";
import { WINE_DISTRIBUTION_MODELS } from "@/lib/constants";
import { listWineries } from "@/lib/pipeline/queries";
import { requireSession } from "@/lib/session";
import { cn } from "@/lib/utils";

type WineriesPageProps = {
  searchParams: Promise<{
    region?: string;
    distributionModel?: string;
  }>;
};

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

export default async function WineriesPage({ searchParams }: WineriesPageProps) {
  const session = await requireSession();
  const filters = await searchParams;

  const wineries = await listWineries(session.user.workspaceId, {
    region: filters.region,
    distributionModel: filters.distributionModel,
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Estate book</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Wineries</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Estates we are in conversation with: region, varietals, distribution model, tasting room status, and the
          next viticulture step.
        </p>
      </div>

      <form method="get" className="grid gap-4 rounded-xl border bg-background p-4 md:grid-cols-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="region">
            Region / AVA
          </label>
          <input
            id="region"
            name="region"
            defaultValue={filters.region ?? ""}
            placeholder="Sonoma Coast"
            className={selectClassName}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="distributionModel">
            Distribution model
          </label>
          <select
            id="distributionModel"
            name="distributionModel"
            defaultValue={filters.distributionModel ?? ""}
            className={selectClassName}
          >
            <option value="">All</option>
            {WINE_DISTRIBUTION_MODELS.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
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
            href="/wineries"
            className="inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium"
          >
            Reset
          </a>
        </div>
      </form>

      <WineryTable wineries={wineries} />
    </div>
  );
}

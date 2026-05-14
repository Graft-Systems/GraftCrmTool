import { notFound } from "next/navigation";

import { ConicSplitPie } from "@/components/capital/conic-split-pie";
import { CapitalReceiptForm } from "@/components/capital/capital-receipt-form";
import { SplitBucketsEditor } from "@/components/capital/split-buckets-editor";
import { Badge } from "@/components/ui/badge";
import { getWorkspaceRunway, listWorkspaceDealsForSelect } from "@/lib/capital/queries";
import { CAPITAL_RECEIPT_SOURCES } from "@/lib/constants";
import { formatDate } from "@/lib/crm";
import { requireSession } from "@/lib/session";

function sourceLabel(source: string) {
  return CAPITAL_RECEIPT_SOURCES.find((item) => item.value === source)?.label ?? source;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function RunwayPage() {
  const session = await requireSession();
  const [runway, deals] = await Promise.all([
    getWorkspaceRunway(session.user.workspaceId),
    listWorkspaceDealsForSelect(session.user.workspaceId),
  ]);

  if (!runway) {
    notFound();
  }

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Runway</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">The forge</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Log every dollar that hits the house, define how you want it carved up, and see a split pie for each
          receipt. Rules are workspace-wide; receipts keep the story of where cash came from.
        </p>
      </div>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border bg-background p-6">
          <h2 className="text-lg font-semibold">Split rules</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Percentages must total 100%. These buckets power every pie below.
          </p>
          <div className="mt-6">
            <SplitBucketsEditor initialBuckets={runway.splitBuckets} />
          </div>
        </div>
        <div className="rounded-xl border bg-background p-6">
          <h2 className="text-lg font-semibold">Log cash in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tie it to a deal when it helps, or mark investor / partner / other.
          </p>
          <div className="mt-6">
            <CapitalReceiptForm deals={deals} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Receipts & split pies</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each inflow gets its own visualization using the current split rules.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            If you change split percentages, existing receipt pies update to match the new carve-out.
          </p>
        </div>
        {runway.receipts.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-background px-6 py-12 text-center text-sm text-muted-foreground">
            No receipts yet. Log one above to light up the board.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {runway.receipts.map((receipt) => (
              <article key={receipt.id} className="flex flex-col rounded-xl border bg-background p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{receipt.title}</h3>
                    <p className="text-2xl font-semibold tracking-tight">{formatMoney(receipt.amount)}</p>
                  </div>
                  <Badge variant="secondary">{sourceLabel(receipt.source)}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Received {formatDate(receipt.receivedAt)} · Logged by{" "}
                  {receipt.createdBy.name ?? receipt.createdBy.email}
                </p>
                {receipt.deal ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Deal: {receipt.deal.name} ({receipt.deal.company.name})
                  </p>
                ) : null}
                {receipt.notes ? (
                  <p className="mt-2 text-sm text-muted-foreground">{receipt.notes}</p>
                ) : null}
                <div className="mt-6 flex flex-1 flex-col items-center justify-center border-t pt-6">
                  <ConicSplitPie amount={receipt.amount} buckets={runway.splitBuckets} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

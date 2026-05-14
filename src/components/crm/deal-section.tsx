import {
  createDealAction,
  updateDealAction,
} from "@/app/(dashboard)/pipeline-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEAL_STAGES } from "@/lib/constants";
import { formatDate } from "@/lib/crm";
import { cn } from "@/lib/utils";

type DealSectionProps = {
  companyId: string;
  users: Array<{ id: string; name: string | null; email: string }>;
  deals: Array<{
    id: string;
    name: string;
    stage: string;
    valueEstimate: number | null;
    expectedClose: Date | null;
    notes: string | null;
    owner: { id: string; name: string | null; email: string } | null;
  }>;
};

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

function stageLabel(stage: string) {
  return DEAL_STAGES.find((item) => item.value === stage)?.label ?? stage;
}

function formatValue(value: number | null) {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function DealSection({ companyId, users, deals }: DealSectionProps) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Deals</h2>
        <p className="text-sm text-muted-foreground">
          Sales and partnership opportunities tied to this company.
        </p>
      </div>

      <div className="space-y-4">
        {deals.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
            No deals yet.
          </div>
        ) : (
          deals.map((deal) => (
            <form
              key={deal.id}
              action={updateDealAction.bind(null, deal.id)}
              className="space-y-4 rounded-xl border bg-background p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge variant="secondary">{stageLabel(deal.stage)}</Badge>
                <p className="text-sm text-muted-foreground">
                  Expected close {formatDate(deal.expectedClose)} · Value {formatValue(deal.valueEstimate)}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`deal-name-${deal.id}`}>Name</Label>
                  <Input id={`deal-name-${deal.id}`} name="name" defaultValue={deal.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`deal-stage-${deal.id}`}>Stage</Label>
                  <select
                    id={`deal-stage-${deal.id}`}
                    name="stage"
                    defaultValue={deal.stage}
                    className={selectClassName}
                  >
                    {DEAL_STAGES.map((stage) => (
                      <option key={stage.value} value={stage.value}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`deal-ownerId-${deal.id}`}>Owner</Label>
                  <select
                    id={`deal-ownerId-${deal.id}`}
                    name="ownerId"
                    defaultValue={deal.owner?.id ?? ""}
                    className={selectClassName}
                  >
                    <option value="">Unassigned</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name ?? user.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`deal-valueEstimate-${deal.id}`}>Value estimate</Label>
                  <Input
                    id={`deal-valueEstimate-${deal.id}`}
                    name="valueEstimate"
                    type="number"
                    min="0"
                    step="1000"
                    defaultValue={deal.valueEstimate ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`deal-expectedClose-${deal.id}`}>Expected close</Label>
                  <Input
                    id={`deal-expectedClose-${deal.id}`}
                    name="expectedClose"
                    type="date"
                    defaultValue={
                      deal.expectedClose ? deal.expectedClose.toISOString().slice(0, 10) : ""
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`deal-notes-${deal.id}`}>Notes</Label>
                  <Textarea id={`deal-notes-${deal.id}`} name="notes" defaultValue={deal.notes ?? ""} />
                </div>
              </div>
              <Button type="submit" size="sm">
                Save deal
              </Button>
            </form>
          ))
        )}
      </div>

      <div className="rounded-xl border bg-background p-4">
        <h3 className="font-medium">Add deal</h3>
        <form action={createDealAction.bind(null, companyId)} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="new-deal-name">Name</Label>
            <Input id="new-deal-name" name="name" required placeholder="Platform rollout" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-deal-stage">Stage</Label>
            <select id="new-deal-stage" name="stage" defaultValue="open" className={selectClassName}>
              {DEAL_STAGES.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-deal-ownerId">Owner</Label>
            <select id="new-deal-ownerId" name="ownerId" defaultValue="" className={selectClassName}>
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name ?? user.email}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-deal-valueEstimate">Value estimate</Label>
            <Input id="new-deal-valueEstimate" name="valueEstimate" type="number" min="0" step="1000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-deal-expectedClose">Expected close</Label>
            <Input id="new-deal-expectedClose" name="expectedClose" type="date" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="new-deal-notes">Notes</Label>
            <Textarea id="new-deal-notes" name="notes" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Add deal</Button>
          </div>
        </form>
      </div>
    </section>
  );
}

import {
  createPilotAction,
  updatePilotAction,
} from "@/app/(dashboard)/pipeline-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PILOT_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/crm";
import { cn } from "@/lib/utils";

type PilotSectionProps = {
  companyId: string;
  users: Array<{ id: string; name: string | null; email: string }>;
  deals: Array<{ id: string; name: string }>;
  pilots: Array<{
    id: string;
    name: string;
    status: string;
    startAt: Date | null;
    targetEndAt: Date | null;
    successCriteria: string | null;
    notes: string | null;
    owner: { id: string; name: string | null; email: string } | null;
    deal: { id: string; name: string } | null;
  }>;
};

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

function statusLabel(status: string) {
  return PILOT_STATUSES.find((item) => item.value === status)?.label ?? status;
}

export function PilotSection({ companyId, users, deals, pilots }: PilotSectionProps) {
  const defaultEnd = new Date();
  defaultEnd.setDate(defaultEnd.getDate() + 30);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Pilots</h2>
        <p className="text-sm text-muted-foreground">
          Evaluation and proof-of-concept tracks for this company.
        </p>
      </div>

      <div className="space-y-4">
        {pilots.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
            No pilots yet.
          </div>
        ) : (
          pilots.map((pilot) => (
            <form
              key={pilot.id}
              action={updatePilotAction.bind(null, pilot.id)}
              className="space-y-4 rounded-xl border bg-background p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge variant="secondary">{statusLabel(pilot.status)}</Badge>
                <p className="text-sm text-muted-foreground">
                  Target end {formatDate(pilot.targetEndAt)}
                  {pilot.deal ? ` · Deal ${pilot.deal.name}` : ""}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`pilot-name-${pilot.id}`}>Name</Label>
                  <Input id={`pilot-name-${pilot.id}`} name="name" defaultValue={pilot.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`pilot-status-${pilot.id}`}>Status</Label>
                  <select
                    id={`pilot-status-${pilot.id}`}
                    name="status"
                    defaultValue={pilot.status}
                    className={selectClassName}
                  >
                    {PILOT_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`pilot-dealId-${pilot.id}`}>Linked deal</Label>
                  <select
                    id={`pilot-dealId-${pilot.id}`}
                    name="dealId"
                    defaultValue={pilot.deal?.id ?? ""}
                    className={selectClassName}
                  >
                    <option value="">No linked deal</option>
                    {deals.map((deal) => (
                      <option key={deal.id} value={deal.id}>
                        {deal.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`pilot-ownerId-${pilot.id}`}>Owner</Label>
                  <select
                    id={`pilot-ownerId-${pilot.id}`}
                    name="ownerId"
                    defaultValue={pilot.owner?.id ?? ""}
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
                  <Label htmlFor={`pilot-startAt-${pilot.id}`}>Start date</Label>
                  <Input
                    id={`pilot-startAt-${pilot.id}`}
                    name="startAt"
                    type="date"
                    defaultValue={pilot.startAt ? pilot.startAt.toISOString().slice(0, 10) : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`pilot-targetEndAt-${pilot.id}`}>Target end</Label>
                  <Input
                    id={`pilot-targetEndAt-${pilot.id}`}
                    name="targetEndAt"
                    type="date"
                    defaultValue={
                      pilot.targetEndAt ? pilot.targetEndAt.toISOString().slice(0, 10) : ""
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`pilot-successCriteria-${pilot.id}`}>Success criteria</Label>
                  <Textarea
                    id={`pilot-successCriteria-${pilot.id}`}
                    name="successCriteria"
                    defaultValue={pilot.successCriteria ?? ""}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`pilot-notes-${pilot.id}`}>Notes</Label>
                  <Textarea id={`pilot-notes-${pilot.id}`} name="notes" defaultValue={pilot.notes ?? ""} />
                </div>
              </div>
              <Button type="submit" size="sm">
                Save pilot
              </Button>
            </form>
          ))
        )}
      </div>

      <div className="rounded-xl border bg-background p-4">
        <h3 className="font-medium">Add pilot</h3>
        <form action={createPilotAction.bind(null, companyId)} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="new-pilot-name">Name</Label>
            <Input id="new-pilot-name" name="name" required placeholder="Field notes pilot" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pilot-status">Status</Label>
            <select id="new-pilot-status" name="status" defaultValue="active" className={selectClassName}>
              {PILOT_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pilot-dealId">Linked deal</Label>
            <select id="new-pilot-dealId" name="dealId" defaultValue="" className={selectClassName}>
              <option value="">No linked deal</option>
              {deals.map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pilot-ownerId">Owner</Label>
            <select id="new-pilot-ownerId" name="ownerId" defaultValue="" className={selectClassName}>
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name ?? user.email}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pilot-startAt">Start date</Label>
            <Input
              id="new-pilot-startAt"
              name="startAt"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pilot-targetEndAt">Target end</Label>
            <Input
              id="new-pilot-targetEndAt"
              name="targetEndAt"
              type="date"
              defaultValue={defaultEnd.toISOString().slice(0, 10)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="new-pilot-successCriteria">Success criteria</Label>
            <Textarea id="new-pilot-successCriteria" name="successCriteria" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="new-pilot-notes">Notes</Label>
            <Textarea id="new-pilot-notes" name="notes" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Add pilot</Button>
          </div>
        </form>
      </div>
    </section>
  );
}

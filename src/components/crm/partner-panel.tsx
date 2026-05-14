import { upsertPartnerProfileAction } from "@/app/(dashboard)/pipeline-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PARTNER_PROGRAM_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type PartnerPanelProps = {
  companyId: string;
  users: Array<{ id: string; name: string | null; email: string }>;
  profile: {
    partnerType: string | null;
    programStatus: string;
    integrationNotes: string | null;
    notes: string | null;
    owner: { id: string; name: string | null; email: string } | null;
  } | null;
};

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

function statusLabel(status: string) {
  return PARTNER_PROGRAM_STATUSES.find((item) => item.value === status)?.label ?? status;
}

export function PartnerPanel({ companyId, users, profile }: PartnerPanelProps) {
  return (
    <section className="space-y-4 rounded-xl border bg-background p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Partner profile</h2>
          <p className="text-sm text-muted-foreground">
            Partnership track, program status, and integration notes.
          </p>
        </div>
        {profile ? <Badge variant="secondary">{statusLabel(profile.programStatus)}</Badge> : null}
      </div>

      <form action={upsertPartnerProfileAction.bind(null, companyId)} className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="partner-partnerType">Partner type</Label>
          <Input
            id="partner-partnerType"
            name="partnerType"
            defaultValue={profile?.partnerType ?? ""}
            placeholder="Technology alliance"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="partner-programStatus">Program status</Label>
          <select
            id="partner-programStatus"
            name="programStatus"
            defaultValue={profile?.programStatus ?? "exploring"}
            className={selectClassName}
          >
            {PARTNER_PROGRAM_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="partner-ownerId">Owner</Label>
          <select
            id="partner-ownerId"
            name="ownerId"
            defaultValue={profile?.owner?.id ?? ""}
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
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="partner-integrationNotes">Integration notes</Label>
          <Textarea
            id="partner-integrationNotes"
            name="integrationNotes"
            defaultValue={profile?.integrationNotes ?? ""}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="partner-notes">Notes</Label>
          <Textarea id="partner-notes" name="notes" defaultValue={profile?.notes ?? ""} />
        </div>
        <div className="md:col-span-2">
          <Button type="submit">{profile ? "Save partner profile" : "Add partner profile"}</Button>
        </div>
      </form>
    </section>
  );
}

import { upsertWineryProfileAction } from "@/app/(dashboard)/pipeline-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  NOTABLE_VARIETALS,
  TASTING_ROOM_STATUSES,
  WINE_DISTRIBUTION_MODELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

type WineryPanelProps = {
  companyId: string;
  profile: {
    region: string | null;
    varietals: string[];
    annualProductionCases: number | null;
    distributionModel: string | null;
    tastingRoomStatus: string | null;
    winemakerName: string | null;
    established: number | null;
    websiteShop: string | null;
    nextStep: string | null;
    notes: string | null;
  } | null;
};

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

function distributionLabel(value: string | null) {
  if (!value) return null;
  return WINE_DISTRIBUTION_MODELS.find((item) => item.value === value)?.label ?? value;
}

function tastingLabel(value: string | null) {
  if (!value) return null;
  return TASTING_ROOM_STATUSES.find((item) => item.value === value)?.label ?? value;
}

export function WineryPanel({ companyId, profile }: WineryPanelProps) {
  const varietalsValue = profile?.varietals.join(", ") ?? "";

  return (
    <section className="space-y-4 rounded-xl border bg-background p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Winery profile</h2>
          <p className="text-sm text-muted-foreground">
            Estate facts: region, varietals, distribution, tasting room, and the next viticulture step.
          </p>
        </div>
        {profile?.region ? <Badge variant="secondary">{profile.region}</Badge> : null}
        {distributionLabel(profile?.distributionModel ?? null) ? (
          <Badge variant="outline">{distributionLabel(profile?.distributionModel ?? null)}</Badge>
        ) : null}
        {tastingLabel(profile?.tastingRoomStatus ?? null) ? (
          <Badge variant="outline">{tastingLabel(profile?.tastingRoomStatus ?? null)}</Badge>
        ) : null}
      </div>

      <form action={upsertWineryProfileAction.bind(null, companyId)} className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="winery-region">Region / AVA</Label>
          <Input
            id="winery-region"
            name="region"
            defaultValue={profile?.region ?? ""}
            placeholder="Sonoma Coast"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="winery-winemakerName">Winemaker</Label>
          <Input
            id="winery-winemakerName"
            name="winemakerName"
            defaultValue={profile?.winemakerName ?? ""}
            placeholder="Elena Marchetti"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="winery-varietals">Varietals</Label>
          <Input
            id="winery-varietals"
            name="varietals"
            list="winery-varietal-options"
            defaultValue={varietalsValue}
            placeholder="Pinot Noir, Chardonnay, Syrah"
          />
          <datalist id="winery-varietal-options">
            {NOTABLE_VARIETALS.map((varietal) => (
              <option key={varietal} value={varietal} />
            ))}
          </datalist>
          <p className="text-xs text-muted-foreground">Comma-separated. Autocompletes from common varietals.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="winery-distributionModel">Distribution model</Label>
          <select
            id="winery-distributionModel"
            name="distributionModel"
            defaultValue={profile?.distributionModel ?? ""}
            className={selectClassName}
          >
            <option value="">Not set</option>
            {WINE_DISTRIBUTION_MODELS.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="winery-tastingRoomStatus">Tasting room</Label>
          <select
            id="winery-tastingRoomStatus"
            name="tastingRoomStatus"
            defaultValue={profile?.tastingRoomStatus ?? ""}
            className={selectClassName}
          >
            <option value="">Not set</option>
            {TASTING_ROOM_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="winery-annualProductionCases">Annual production (cases)</Label>
          <Input
            id="winery-annualProductionCases"
            name="annualProductionCases"
            type="number"
            min={0}
            step={100}
            defaultValue={profile?.annualProductionCases ?? ""}
            placeholder="8000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="winery-established">Established</Label>
          <Input
            id="winery-established"
            name="established"
            type="number"
            min={1500}
            max={2099}
            defaultValue={profile?.established ?? ""}
            placeholder="2014"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="winery-websiteShop">Direct-to-consumer shop</Label>
          <Input
            id="winery-websiteShop"
            name="websiteShop"
            defaultValue={profile?.websiteShop ?? ""}
            placeholder="https://shop.stonefieldvineyards.com"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="winery-nextStep">Next step</Label>
          <Input
            id="winery-nextStep"
            name="nextStep"
            defaultValue={profile?.nextStep ?? ""}
            placeholder="Send rootstock sample for grafting trial"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="winery-notes">Notes</Label>
          <Textarea id="winery-notes" name="notes" defaultValue={profile?.notes ?? ""} />
        </div>
        <div className="md:col-span-2">
          <Button type="submit">{profile ? "Save winery profile" : "Add winery profile"}</Button>
        </div>
      </form>
    </section>
  );
}

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TASTING_ROOM_STATUSES, WINE_DISTRIBUTION_MODELS } from "@/lib/constants";
import { formatDate, summarizeText } from "@/lib/crm";

type WineryTableProps = {
  wineries: Array<{
    id: string;
    region: string | null;
    varietals: string[];
    annualProductionCases: number | null;
    distributionModel: string | null;
    tastingRoomStatus: string | null;
    winemakerName: string | null;
    nextStep: string | null;
    updatedAt: Date;
    company: { id: string; name: string };
  }>;
};

function distributionLabel(value: string | null) {
  if (!value) return "—";
  return WINE_DISTRIBUTION_MODELS.find((item) => item.value === value)?.label ?? value;
}

function tastingLabel(value: string | null) {
  if (!value) return "—";
  return TASTING_ROOM_STATUSES.find((item) => item.value === value)?.label ?? value;
}

function formatCases(value: number | null) {
  if (!value) return "—";
  return `${new Intl.NumberFormat("en-US").format(value)} cases`;
}

export function WineryTable({ wineries }: WineryTableProps) {
  if (wineries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-background px-6 py-12 text-center">
        <p className="text-sm font-medium">No wineries match these filters.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Open a company and add a winery profile to populate this view.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Winery</TableHead>
            <TableHead>Region</TableHead>
            <TableHead>Varietals</TableHead>
            <TableHead>Production</TableHead>
            <TableHead>Distribution</TableHead>
            <TableHead>Tasting room</TableHead>
            <TableHead>Winemaker</TableHead>
            <TableHead>Next step</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {wineries.map((winery) => (
            <TableRow key={winery.id}>
              <TableCell>
                <Link
                  href={`/companies/${winery.company.id}`}
                  className="font-medium hover:underline"
                >
                  {winery.company.name}
                </Link>
              </TableCell>
              <TableCell>{winery.region ?? "—"}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {winery.varietals.length === 0
                    ? "—"
                    : winery.varietals.map((varietal) => (
                        <Badge key={varietal} variant="outline">
                          {varietal}
                        </Badge>
                      ))}
                </div>
              </TableCell>
              <TableCell>{formatCases(winery.annualProductionCases)}</TableCell>
              <TableCell>
                <Badge variant="secondary">{distributionLabel(winery.distributionModel)}</Badge>
              </TableCell>
              <TableCell>{tastingLabel(winery.tastingRoomStatus)}</TableCell>
              <TableCell>{winery.winemakerName ?? "—"}</TableCell>
              <TableCell className="max-w-xs">
                <p className="text-sm text-muted-foreground">
                  {summarizeText(winery.nextStep, 80) || "—"}
                </p>
              </TableCell>
              <TableCell>{formatDate(winery.updatedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

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
import { PILOT_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/crm";

type PilotTableProps = {
  pilots: Array<{
    id: string;
    name: string;
    status: string;
    targetEndAt: Date | null;
    company: { id: string; name: string };
    owner: { name: string | null; email: string } | null;
    deal: { id: string; name: string } | null;
  }>;
};

function statusLabel(status: string) {
  return PILOT_STATUSES.find((item) => item.value === status)?.label ?? status;
}

export function PilotTable({ pilots }: PilotTableProps) {
  if (pilots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-background px-6 py-12 text-center">
        <p className="text-sm font-medium">No pilots match these filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pilot</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Linked deal</TableHead>
            <TableHead>Target end</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pilots.map((pilot) => (
            <TableRow key={pilot.id}>
              <TableCell className="font-medium">{pilot.name}</TableCell>
              <TableCell>
                <Link href={`/companies/${pilot.company.id}`} className="hover:underline">
                  {pilot.company.name}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{statusLabel(pilot.status)}</Badge>
              </TableCell>
              <TableCell>{pilot.owner ? pilot.owner.name ?? pilot.owner.email : "—"}</TableCell>
              <TableCell>{pilot.deal?.name ?? "—"}</TableCell>
              <TableCell>{formatDate(pilot.targetEndAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

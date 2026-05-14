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
import { DEAL_STAGES } from "@/lib/constants";
import { formatDate } from "@/lib/crm";

type DealTableProps = {
  deals: Array<{
    id: string;
    name: string;
    stage: string;
    valueEstimate: number | null;
    expectedClose: Date | null;
    company: { id: string; name: string };
    owner: { name: string | null; email: string } | null;
  }>;
};

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

export function DealTable({ deals }: DealTableProps) {
  if (deals.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-background px-6 py-12 text-center">
        <p className="text-sm font-medium">No deals match these filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Deal</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Expected close</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deals.map((deal) => (
            <TableRow key={deal.id}>
              <TableCell className="font-medium">{deal.name}</TableCell>
              <TableCell>
                <Link href={`/companies/${deal.company.id}`} className="hover:underline">
                  {deal.company.name}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{stageLabel(deal.stage)}</Badge>
              </TableCell>
              <TableCell>{deal.owner ? deal.owner.name ?? deal.owner.email : "—"}</TableCell>
              <TableCell>{formatValue(deal.valueEstimate)}</TableCell>
              <TableCell>{formatDate(deal.expectedClose)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

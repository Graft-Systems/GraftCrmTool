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
import { PARTNER_PROGRAM_STATUSES } from "@/lib/constants";
import { formatDate, summarizeText } from "@/lib/crm";

type PartnerTableProps = {
  partners: Array<{
    id: string;
    partnerType: string | null;
    programStatus: string;
    integrationNotes: string | null;
    updatedAt: Date;
    company: { id: string; name: string };
    owner: { name: string | null; email: string } | null;
  }>;
};

function statusLabel(status: string) {
  return PARTNER_PROGRAM_STATUSES.find((item) => item.value === status)?.label ?? status;
}

export function PartnerTable({ partners }: PartnerTableProps) {
  if (partners.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-background px-6 py-12 text-center">
        <p className="text-sm font-medium">No partner profiles match these filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Partner type</TableHead>
            <TableHead>Program status</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Integration notes</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {partners.map((partner) => (
            <TableRow key={partner.id}>
              <TableCell>
                <Link href={`/companies/${partner.company.id}`} className="font-medium hover:underline">
                  {partner.company.name}
                </Link>
              </TableCell>
              <TableCell>{partner.partnerType ?? "—"}</TableCell>
              <TableCell>
                <Badge variant="secondary">{statusLabel(partner.programStatus)}</Badge>
              </TableCell>
              <TableCell>{partner.owner ? partner.owner.name ?? partner.owner.email : "—"}</TableCell>
              <TableCell className="max-w-xs">
                <p className="text-sm text-muted-foreground">
                  {summarizeText(partner.integrationNotes, 80) || "—"}
                </p>
              </TableCell>
              <TableCell>{formatDate(partner.updatedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

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
import { INVESTOR_STAGES } from "@/lib/constants";
import { formatDate, summarizeText } from "@/lib/crm";

type InvestorTableProps = {
  investors: Array<{
    id: string;
    fundName: string | null;
    stage: string;
    checkSizeBand: string | null;
    thesisTags: string[];
    nextStep: string | null;
    updatedAt: Date;
    company: { id: string; name: string };
  }>;
};

function stageLabel(stage: string) {
  return INVESTOR_STAGES.find((item) => item.value === stage)?.label ?? stage;
}

export function InvestorTable({ investors }: InvestorTableProps) {
  if (investors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-background px-6 py-12 text-center">
        <p className="text-sm font-medium">No investor profiles match these filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Fund</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Check size</TableHead>
            <TableHead>Thesis tags</TableHead>
            <TableHead>Next step</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {investors.map((investor) => (
            <TableRow key={investor.id}>
              <TableCell>
                <Link href={`/companies/${investor.company.id}`} className="font-medium hover:underline">
                  {investor.company.name}
                </Link>
              </TableCell>
              <TableCell>{investor.fundName ?? "—"}</TableCell>
              <TableCell>
                <Badge variant="secondary">{stageLabel(investor.stage)}</Badge>
              </TableCell>
              <TableCell>{investor.checkSizeBand ?? "—"}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {investor.thesisTags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="max-w-xs">
                <p className="text-sm text-muted-foreground">
                  {summarizeText(investor.nextStep, 80) || "—"}
                </p>
              </TableCell>
              <TableCell>{formatDate(investor.updatedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

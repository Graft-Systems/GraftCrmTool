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
import { formatDate, parseTags, summarizeText } from "@/lib/crm";

type CompanyTableProps = {
  companies: Array<{
    id: string;
    name: string;
    domain: string | null;
    needs: string | null;
    updatedAt: Date;
    tags: unknown;
    relationshipStage: { label: string } | null;
    accountOwner: { name: string | null; email: string };
    contacts: Array<{ id: string; name: string; isPrimary: boolean }>;
    _count: {
      followUpTasks: number;
      deals: number;
      pilots: number;
    };
  }>;
};

export function CompanyTable({ companies }: CompanyTableProps) {
  if (companies.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-background px-6 py-12 text-center">
        <p className="text-sm font-medium">No companies match these filters.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a company or broaden your search.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Needs</TableHead>
            <TableHead>Open tasks</TableHead>
            <TableHead>Pipeline</TableHead>
            <TableHead>Contacts</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Last updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => {
            const primaryContact =
              company.contacts.find((contact) => contact.isPrimary) ?? company.contacts[0];

            return (
              <TableRow key={company.id}>
                <TableCell>
                  <Link
                    href={`/companies/${company.id}`}
                    className="font-medium hover:underline"
                  >
                    {company.name}
                  </Link>
                  {company.domain ? (
                    <p className="text-xs text-muted-foreground">{company.domain}</p>
                  ) : null}
                </TableCell>
                <TableCell>
                  {company.relationshipStage ? (
                    <Badge variant="secondary">{company.relationshipStage.label}</Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>{company.accountOwner.name ?? company.accountOwner.email}</TableCell>
                <TableCell className="max-w-xs">
                  <p className="text-sm text-muted-foreground">
                    {summarizeText(company.needs, 90) || "—"}
                  </p>
                </TableCell>
                <TableCell>{company._count.followUpTasks}</TableCell>
                <TableCell>
                  <p className="text-sm">
                    {company._count.deals} deal{company._count.deals === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {company._count.pilots} active pilot{company._count.pilots === 1 ? "" : "s"}
                  </p>
                </TableCell>
                <TableCell>
                  <p>{company.contacts.length}</p>
                  {primaryContact ? (
                    <p className="text-xs text-muted-foreground">{primaryContact.name}</p>
                  ) : null}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {parseTags(company.tags).map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{formatDate(company.updatedAt)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

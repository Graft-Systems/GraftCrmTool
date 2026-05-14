import Link from "next/link";

import { completeTaskAction } from "@/app/(dashboard)/work-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/crm";

type InboxTaskTableProps = {
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    dueAt: Date | null;
    company: { id: string; name: string };
    contact: { id: string; name: string } | null;
    owner: { name: string | null; email: string } | null;
  }>;
};

export function InboxTaskTable({ tasks }: InboxTaskTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-background px-6 py-12 text-center">
        <p className="text-sm font-medium">No follow-ups in this view.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create tasks from a company page or switch views.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell>
                <p className="font-medium">{task.title}</p>
                {task.contact ? (
                  <p className="text-xs text-muted-foreground">{task.contact.name}</p>
                ) : null}
              </TableCell>
              <TableCell>
                <Link href={`/companies/${task.company.id}`} className="hover:underline">
                  {task.company.name}
                </Link>
              </TableCell>
              <TableCell>{task.owner ? task.owner.name ?? task.owner.email : "Unassigned"}</TableCell>
              <TableCell>{formatDate(task.dueAt)}</TableCell>
              <TableCell>
                <Badge variant="secondary">{task.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {task.status === "open" ? (
                  <form action={completeTaskAction.bind(null, task.id)}>
                    <Button type="submit" size="sm" variant="outline">
                      Done
                    </Button>
                  </form>
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

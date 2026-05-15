import Link from "next/link";
import { notFound } from "next/navigation";

import {
  createContactAction,
  deleteCompanyAction,
  deleteContactAction,
  updateContactAction,
} from "@/server/actions/companies";
import { CommentsSection } from "@/components/work/comments-section";
import { ContactList } from "@/components/companies/contact-list";
import { InteractionSection } from "@/components/work/interaction-section";
import { InvestorPanel } from "@/components/investors/investor-panel";
import { NeedsPanel } from "@/components/companies/needs-panel";
import { TaskSection } from "@/components/work/task-section";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { getCompany, listWorkspaceUsers } from "@/lib/companies/queries";
import { formatDate, parseTags } from "@/lib/crm";
import {
  getCompanyInvestorProfile,
  listCompanyDeals,
} from "@/lib/pipeline/queries";
import { requireSession } from "@/lib/session";
import { listCompanyComments } from "@/lib/work/comments";
import { listCompanyInteractions, listCompanyTasks } from "@/lib/work/queries";

type CompanyDetailPageProps = {
  params: Promise<{ companyId: string }>;
};

export default async function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const session = await requireSession();
  const { companyId } = await params;
  const [
    company,
    users,
    interactions,
    tasks,
    deals,
    investorProfile,
    comments,
  ] = await Promise.all([
    getCompany(session.user.workspaceId, companyId),
    listWorkspaceUsers(session.user.workspaceId),
    listCompanyInteractions(companyId),
    listCompanyTasks(companyId),
    listCompanyDeals(companyId),
    getCompanyInvestorProfile(companyId),
    listCompanyComments(companyId),
  ]);

  if (!company) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {company.relationshipStage ? (
              <Badge variant="secondary">{company.relationshipStage.label}</Badge>
            ) : null}
            {parseTags(company.tags).map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{company.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Owner: {company.accountOwner.name ?? company.accountOwner.email} · Updated{" "}
              {formatDate(company.updatedAt)}
            </p>
          </div>
          {company.domain ? (
            <p className="text-sm text-muted-foreground">{company.domain}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/companies/${company.id}/notes`}
            className={buttonVariants({ variant: "default" })}
          >
            Open notes
          </Link>
          <Link
            href={`/companies/${company.id}/edit`}
            className={buttonVariants({ variant: "outline" })}
          >
            Edit company
          </Link>
          <form action={deleteCompanyAction.bind(null, company.id)}>
            <Button type="submit" variant="outline">
              Delete
            </Button>
          </form>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <NeedsPanel companyId={company.id} needs={company.needs} />
        <div className="rounded-xl border bg-background p-6">
          <h2 className="text-lg font-semibold">Company details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Website</dt>
              <dd>{company.website || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Description</dt>
              <dd className="whitespace-pre-wrap">{company.description || "—"}</dd>
            </div>
          </dl>
        </div>
      </section>

      <InvestorPanel
        companyId={company.id}
        profile={
          investorProfile
            ? {
                ...investorProfile,
                thesisTags: parseTags(investorProfile.thesisTags),
              }
            : null
        }
      />

      <InteractionSection
        companyId={company.id}
        contacts={company.contacts}
        interactions={interactions}
      />

      <TaskSection
        companyId={company.id}
        contacts={company.contacts}
        users={users}
        deals={deals.map((deal) => ({ id: deal.id, name: deal.name }))}
        tasks={tasks}
      />

      <CommentsSection
        companyId={company.id}
        currentUserId={session.user.id}
        currentUserRole={session.user.role}
        comments={comments}
      />

      <ContactList
        companyId={company.id}
        contacts={company.contacts}
        createContactAction={createContactAction}
        updateContactAction={updateContactAction}
        deleteContactAction={deleteContactAction}
      />
    </div>
  );
}

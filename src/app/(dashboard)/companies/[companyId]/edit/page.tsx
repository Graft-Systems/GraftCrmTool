import { notFound } from "next/navigation";

import { CompanyForm } from "@/components/crm/company-form";
import { updateCompanyAction } from "@/app/(dashboard)/actions";
import {
  getCompany,
  listKnownTags,
  listRelationshipStages,
  listWorkspaceUsers,
} from "@/lib/companies/queries";
import { requireSession } from "@/lib/session";

type EditCompanyPageProps = {
  params: Promise<{ companyId: string }>;
};

export default async function EditCompanyPage({ params }: EditCompanyPageProps) {
  const session = await requireSession();
  const { companyId } = await params;

  const [company, users, stages, tags] = await Promise.all([
    getCompany(session.user.workspaceId, companyId),
    listWorkspaceUsers(session.user.workspaceId),
    listRelationshipStages(session.user.workspaceId),
    listKnownTags(session.user.workspaceId),
  ]);

  if (!company) {
    notFound();
  }

  const updateAction = updateCompanyAction.bind(null, company.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Edit company</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update account details, stage, owner, and tags for {company.name}.
        </p>
      </div>
      <div className="rounded-xl border bg-background p-6">
        <CompanyForm
          action={updateAction}
          users={users}
          stages={stages}
          tagSuggestions={tags}
          submitLabel="Save changes"
          company={company}
        />
      </div>
    </div>
  );
}

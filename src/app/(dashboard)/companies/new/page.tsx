import { CompanyForm } from "@/components/crm/company-form";
import { createCompanyAction } from "@/app/(dashboard)/actions";
import {
  listKnownTags,
  listRelationshipStages,
  listWorkspaceUsers,
} from "@/lib/companies/queries";
import { requireSession } from "@/lib/session";

export default async function NewCompanyPage() {
  const session = await requireSession();

  const [users, stages, tags] = await Promise.all([
    listWorkspaceUsers(session.user.workspaceId),
    listRelationshipStages(session.user.workspaceId),
    listKnownTags(session.user.workspaceId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Add company</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create an organization record and assign stage, owner, and tags.
        </p>
      </div>
      <div className="rounded-xl border bg-background p-6">
        <CompanyForm
          action={createCompanyAction}
          users={users}
          stages={stages}
          tagSuggestions={tags}
          submitLabel="Create company"
        />
      </div>
    </div>
  );
}

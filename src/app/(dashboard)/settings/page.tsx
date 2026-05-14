import { updateStageLabelAction } from "@/app/(dashboard)/actions";
import {
  connectDemoCalendarAction,
  disconnectCalendarAction,
  refreshDemoCalendarAction,
} from "@/app/(dashboard)/calendar-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listCalendarAccountsForUser } from "@/lib/calendar/queries";
import { listKnownTags, listRelationshipStages } from "@/lib/companies/queries";
import { CALENDAR_PROVIDERS } from "@/lib/constants";
import { requireSession } from "@/lib/session";

function providerLabel(provider: string) {
  return CALENDAR_PROVIDERS.find((entry) => entry.value === provider)?.label ?? provider;
}

export default async function SettingsPage() {
  const session = await requireSession();
  const [stages, tags, calendarAccounts] = await Promise.all([
    listRelationshipStages(session.user.workspaceId),
    listKnownTags(session.user.workspaceId),
    listCalendarAccountsForUser(session.user.id),
  ]);

  const googleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
  const activeAccounts = calendarAccounts.filter((account) => account.status !== "disconnected");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Workspace defaults and personal integrations.
        </p>
      </div>

      <section className="space-y-4 rounded-xl border bg-background p-6">
        <div>
          <h2 className="text-lg font-semibold">Calendar integrations</h2>
          <p className="text-sm text-muted-foreground">
            Sync your calendar so external meetings surface in the CRM. Demo mode works out of the box for
            evaluation. Real Google sync activates once <code className="rounded bg-muted px-1">GOOGLE_CLIENT_ID</code>
            and <code className="rounded bg-muted px-1">GOOGLE_CLIENT_SECRET</code> are set.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Google Calendar</p>
              <Badge variant={googleConfigured ? "secondary" : "outline"}>
                {googleConfigured ? "Configured" : "Not configured"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Sign in with your Google account to import meetings, attendees, and meeting links.
            </p>
            <Button type="button" variant="outline" size="sm" disabled>
              {googleConfigured ? "Connect Google (coming soon)" : "Add credentials to enable"}
            </Button>
          </div>
          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Demo calendar</p>
              <Badge variant="secondary">Ready</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Loads sample meetings (Stonefield, Acme, an unmatched distributor) so the workflow is testable now.
            </p>
            <form action={connectDemoCalendarAction}>
              <Button type="submit" size="sm">
                {activeAccounts.find((a) => a.provider === "demo")
                  ? "Refresh demo meetings"
                  : "Connect demo calendar"}
              </Button>
            </form>
          </div>
        </div>

        {calendarAccounts.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Your accounts</p>
            <div className="space-y-2">
              {calendarAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {account.displayName ?? providerLabel(account.provider)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {providerLabel(account.provider)} · {account.status}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {account.provider === "demo" && account.status === "connected" ? (
                      <form action={refreshDemoCalendarAction.bind(null, account.id)}>
                        <Button type="submit" variant="outline" size="sm">
                          Refresh
                        </Button>
                      </form>
                    ) : null}
                    {account.status === "connected" ? (
                      <form action={disconnectCalendarAction.bind(null, account.id)}>
                        <Button type="submit" variant="outline" size="sm">
                          Disconnect
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-4 rounded-xl border bg-background p-6">
        <div>
          <h2 className="text-lg font-semibold">Relationship stages</h2>
          <p className="text-sm text-muted-foreground">
            Rename stage labels for the team. Keys stay stable for reporting.
          </p>
        </div>
        <div className="space-y-3">
          {stages.map((stage) => (
            <form
              key={stage.id}
              action={updateStageLabelAction}
              className="grid gap-3 rounded-lg border p-4 md:grid-cols-[160px_1fr_auto]"
            >
              <div>
                <p className="text-sm font-medium">{stage.key}</p>
                <p className="text-xs text-muted-foreground">Order {stage.sortOrder + 1}</p>
              </div>
              <Input name="label" defaultValue={stage.label} required />
              <input type="hidden" name="stageId" value={stage.id} />
              <Button type="submit" variant="outline">
                Save
              </Button>
            </form>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-background p-6">
        <div>
          <h2 className="text-lg font-semibold">Known tags</h2>
          <p className="text-sm text-muted-foreground">
            Tags already used on companies. They appear as suggestions on company forms.
          </p>
        </div>
        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tags yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full border px-3 py-1 text-sm">
                {tag}
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

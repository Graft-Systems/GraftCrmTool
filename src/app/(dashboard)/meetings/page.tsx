import Link from "next/link";

import { connectDemoCalendarAction } from "@/app/(dashboard)/calendar-actions";
import { MeetingCard } from "@/components/meetings/meeting-card";
import { Button } from "@/components/ui/button";
import { listWorkspaceCompaniesForSelect } from "@/lib/calendar/companies";
import { listCalendarAccountsForUser, listMeetingsForUser } from "@/lib/calendar/queries";
import { requireSession } from "@/lib/session";

type MeetingsPageProps = {
  searchParams: Promise<{ scope?: string }>;
};

function bucketEvents<T extends { startsAt: Date }>(events: T[]) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const past: T[] = [];
  const today: T[] = [];
  const week: T[] = [];
  const later: T[] = [];

  for (const event of events) {
    if (event.startsAt < startOfToday) past.push(event);
    else if (event.startsAt < endOfToday) today.push(event);
    else if (event.startsAt < endOfWeek) week.push(event);
    else later.push(event);
  }

  return { past, today, week, later };
}

export default async function MeetingsPage({ searchParams }: MeetingsPageProps) {
  const session = await requireSession();
  const filters = await searchParams;
  const scope = filters.scope === "all" ? "all" : "mine";

  const [accounts, companies, events] = await Promise.all([
    listCalendarAccountsForUser(session.user.id),
    listWorkspaceCompaniesForSelect(session.user.workspaceId),
    listMeetingsForUser(session.user.workspaceId, session.user.id, {
      mineOnly: scope === "mine",
    }),
  ]);

  const activeAccount = accounts.find((account) => account.status === "connected");
  const { past, today, week, later } = bucketEvents(events);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Signal desk</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Meetings</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Calendar events synced to the CRM. Confirm the company link and log the meeting in one click.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/meetings?scope=mine"
            className={`rounded-full border px-3 py-1 ${scope === "mine" ? "bg-primary text-primary-foreground" : ""}`}
          >
            My calendar
          </Link>
          <Link
            href="/meetings?scope=all"
            className={`rounded-full border px-3 py-1 ${scope === "all" ? "bg-primary text-primary-foreground" : ""}`}
          >
            Team
          </Link>
        </div>
      </div>

      {!activeAccount ? (
        <section className="rounded-xl border border-dashed bg-background p-6">
          <h2 className="text-lg font-semibold">Connect a calendar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Hook in your calendar to surface meetings here. Google OAuth requires a Cloud project (configure
            <code className="mx-1 rounded bg-muted px-1">GOOGLE_CLIENT_ID</code>and
            <code className="mx-1 rounded bg-muted px-1">GOOGLE_CLIENT_SECRET</code>). Until then, use the demo
            calendar — it seeds realistic upcoming meetings with Stonefield, Acme, and an unmatched distributor.
          </p>
          <form action={connectDemoCalendarAction} className="mt-3">
            <Button type="submit">Connect demo calendar</Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            You can also manage calendar accounts in <Link href="/settings" className="underline">Settings</Link>.
          </p>
        </section>
      ) : null}

      {events.length === 0 && activeAccount ? (
        <div className="rounded-xl border border-dashed bg-background px-6 py-12 text-center">
          <p className="text-sm font-medium">No calendar events in range.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try the team scope or refresh the demo calendar from Settings.
          </p>
        </div>
      ) : null}

      {today.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Today</h2>
          {today.map((event) => (
            <MeetingCard key={event.id} event={event} companies={companies} />
          ))}
        </section>
      ) : null}

      {week.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">This week</h2>
          {week.map((event) => (
            <MeetingCard key={event.id} event={event} companies={companies} />
          ))}
        </section>
      ) : null}

      {later.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Later</h2>
          {later.map((event) => (
            <MeetingCard key={event.id} event={event} companies={companies} />
          ))}
        </section>
      ) : null}

      {past.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recently completed</h2>
          {past.map((event) => (
            <MeetingCard key={event.id} event={event} companies={companies} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

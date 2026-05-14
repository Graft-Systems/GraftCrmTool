import { formatDateTime } from "@/lib/crm";

type ActivityFeedProps = {
  events: Array<{
    id: string;
    kind: string;
    summary: string;
    createdAt: Date;
    actor: { name: string | null; email: string } | null;
  }>;
};

export function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Activity</h2>
        <p className="text-sm text-muted-foreground">
          Recent changes across interactions, AI-reviewed notes, tasks, pipeline entities, and needs.
        </p>
      </div>
      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
          No activity yet.
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <article key={event.id} className="rounded-xl border bg-background p-4">
              <p className="text-sm">{event.summary}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatDateTime(event.createdAt)}
                {event.actor ? ` · ${event.actor.name ?? event.actor.email}` : ""}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

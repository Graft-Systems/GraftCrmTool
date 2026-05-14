import { prisma } from "@/lib/db";

type DemoSeedContext = {
  workspaceId: string;
  userId: string;
  calendarAccountId: string;
};

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export async function seedDemoEvents({ workspaceId, userId, calendarAccountId }: DemoSeedContext) {
  const stonefield = await prisma.company.findFirst({
    where: { workspaceId, name: "Stonefield Vineyards" },
    select: { id: true, contacts: { take: 1, where: { isPrimary: true } } },
  });
  const acme = await prisma.company.findFirst({
    where: { workspaceId, name: "Acme Robotics" },
    select: { id: true, contacts: { where: { isPrimary: true }, take: 1 } },
  });

  const today = new Date();
  today.setMinutes(0, 0, 0);
  const at = (hourOffset: number) => {
    const d = new Date(today);
    d.setHours(today.getHours() + hourOffset);
    return d;
  };

  type DemoEvent = {
    externalId: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    attendees: { email: string; name: string; isOrganizer?: boolean }[];
    location?: string;
    meetingUrl?: string;
    description?: string;
  };

  const events: DemoEvent[] = [
    {
      externalId: "demo-stonefield-tasting",
      title: "Stonefield tasting + grafting trial review",
      startsAt: at(3),
      endsAt: at(4),
      attendees: [
        { email: "elena@stonefieldvineyards.example", name: "Elena Marchetti" },
        { email: "owner@graft.systems", name: "Graft Owner", isOrganizer: true },
      ],
      location: "Stonefield Vineyards tasting room",
      description: "Walk the trial block, taste barrel samples, lock in next graft kit shipment.",
    },
    {
      externalId: "demo-acme-pilot-checkin",
      title: "Acme field-notes pilot weekly",
      startsAt: hoursFromNow(28),
      endsAt: hoursFromNow(29),
      attendees: [
        { email: "sarah@acme.example", name: "Sarah Chen" },
        { email: "marcus@acme.example", name: "Marcus Lee" },
        { email: "owner@graft.systems", name: "Graft Owner", isOrganizer: true },
      ],
      meetingUrl: "https://meet.example/abc-defg-hij",
      description: "Week-two metrics review and security follow-ups.",
    },
    {
      externalId: "demo-unmatched-cabernet-club",
      title: "Intro: Cabernet Club distributor",
      startsAt: hoursFromNow(72),
      endsAt: hoursFromNow(73),
      attendees: [
        { email: "buyer@cabernetclub.example", name: "Priya Rao" },
        { email: "teammate@graft.systems", name: "Graft Teammate", isOrganizer: true },
      ],
      description: "Cold intro from conference - explore wine-club distribution fit.",
    },
  ];

  for (const event of events) {
    await prisma.calendarEvent.upsert({
      where: {
        calendarAccountId_externalId: {
          calendarAccountId,
          externalId: event.externalId,
        },
      },
      update: {
        title: event.title,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        description: event.description ?? null,
        location: event.location ?? null,
        meetingUrl: event.meetingUrl ?? null,
        attendees: event.attendees,
        organizerEmail: event.attendees.find((attendee) => attendee.isOrganizer)?.email ?? null,
        linkStatus: "unmatched",
        companyId: null,
        contactId: null,
      },
      create: {
        workspaceId,
        calendarAccountId,
        externalId: event.externalId,
        title: event.title,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        description: event.description ?? null,
        location: event.location ?? null,
        meetingUrl: event.meetingUrl ?? null,
        attendees: event.attendees,
        organizerEmail: event.attendees.find((attendee) => attendee.isOrganizer)?.email ?? null,
        linkStatus: "unmatched",
      },
    });
  }

  return { stonefieldId: stonefield?.id ?? null, acmeId: acme?.id ?? null, userId };
}

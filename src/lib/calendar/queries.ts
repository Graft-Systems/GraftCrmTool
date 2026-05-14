import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/db";

import {
  domainOf,
  externalAttendees,
  parseAttendees,
  type EventAttendee,
} from "@/lib/calendar/attendees";

const meetingInclude = {
  company: { select: { id: true, name: true } },
  contact: { select: { id: true, name: true } },
  interaction: { select: { id: true } },
  calendarAccount: {
    select: { id: true, provider: true, displayName: true, userId: true },
  },
} satisfies Prisma.CalendarEventInclude;

type RawMeeting = Prisma.CalendarEventGetPayload<{ include: typeof meetingInclude }>;

export type CalendarSuggestion = {
  companyId: string;
  companyName: string;
  contactId: string | null;
  contactName: string | null;
  matchedEmail: string;
  matchKind: "exact_email" | "domain";
};

export async function getCalendarAccountForUser(userId: string) {
  return prisma.calendarAccount.findFirst({
    where: { userId, status: { not: "disconnected" } },
    orderBy: { connectedAt: "desc" },
  });
}

export async function listCalendarAccountsForUser(userId: string) {
  return prisma.calendarAccount.findMany({
    where: { userId },
    orderBy: { connectedAt: "desc" },
  });
}

async function buildSuggestion(
  workspaceId: string,
  attendees: EventAttendee[],
): Promise<CalendarSuggestion | null> {
  const externals = externalAttendees(attendees);
  if (externals.length === 0) return null;

  const emails = externals.map((attendee) => attendee.email);
  const contact = await prisma.contact.findFirst({
    where: {
      email: { in: emails },
      company: { workspaceId },
    },
    include: { company: { select: { id: true, name: true, workspaceId: true } } },
  });

  if (contact && contact.company.workspaceId === workspaceId) {
    return {
      companyId: contact.company.id,
      companyName: contact.company.name,
      contactId: contact.id,
      contactName: contact.name,
      matchedEmail: contact.email ?? externals[0].email,
      matchKind: "exact_email",
    };
  }

  const domains = Array.from(
    new Set(externals.map((attendee) => domainOf(attendee.email)).filter(Boolean) as string[]),
  );
  if (domains.length === 0) return null;

  const company = await prisma.company.findFirst({
    where: {
      workspaceId,
      domain: { in: domains },
    },
    select: { id: true, name: true, domain: true },
  });

  if (!company) return null;

  const externalMatch = externals.find(
    (attendee) => domainOf(attendee.email) === company.domain,
  );

  return {
    companyId: company.id,
    companyName: company.name,
    contactId: null,
    contactName: null,
    matchedEmail: externalMatch?.email ?? externals[0].email,
    matchKind: "domain",
  };
}

export type CalendarEventListItem = Omit<RawMeeting, "attendees"> & {
  attendees: EventAttendee[];
  suggestion: CalendarSuggestion | null;
};

export async function listMeetingsForUser(
  workspaceId: string,
  userId: string,
  options: { since?: Date; until?: Date; mineOnly?: boolean } = {},
): Promise<CalendarEventListItem[]> {
  const since = options.since ?? new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
  const until = options.until ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  const events = await prisma.calendarEvent.findMany({
    where: {
      workspaceId,
      startsAt: { gte: since, lte: until },
      ...(options.mineOnly ? { calendarAccount: { userId } } : {}),
    },
    include: meetingInclude,
    orderBy: { startsAt: "asc" },
  });

  const decorated: CalendarEventListItem[] = [];
  for (const event of events) {
    const attendees = parseAttendees(event.attendees);
    const suggestion =
      event.linkStatus === "unmatched" || event.linkStatus === "suggested"
        ? await buildSuggestion(workspaceId, attendees)
        : null;
    decorated.push({ ...event, attendees, suggestion });
  }

  return decorated;
}

export async function getCalendarEvent(workspaceId: string, eventId: string) {
  return prisma.calendarEvent.findFirst({
    where: { id: eventId, workspaceId },
    include: {
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true } },
      interaction: { select: { id: true } },
      calendarAccount: true,
    },
  });
}

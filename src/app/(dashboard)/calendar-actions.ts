"use server";

import { revalidatePath } from "next/cache";

import { parseAttendees } from "@/lib/calendar/attendees";
import { seedDemoEvents } from "@/lib/calendar/demo";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { recordActivity, touchCompany } from "@/lib/work/activity";

function revalidateMeetingPaths(companyId?: string) {
  revalidatePath("/meetings");
  revalidatePath("/settings");
  revalidatePath("/inbox");
  if (companyId) {
    revalidatePath(`/companies/${companyId}`);
  }
}

export async function connectDemoCalendarAction() {
  const session = await requireSession();
  const userId = session.user.id;

  const account = await prisma.calendarAccount.upsert({
    where: {
      userId_provider_externalAccountId: {
        userId,
        provider: "demo",
        externalAccountId: "demo-primary",
      },
    },
    update: {
      status: "connected",
      displayName: "Demo calendar",
      connectedAt: new Date(),
    },
    create: {
      userId,
      provider: "demo",
      externalAccountId: "demo-primary",
      displayName: "Demo calendar",
      status: "connected",
    },
  });

  await seedDemoEvents({
    workspaceId: session.user.workspaceId,
    userId,
    calendarAccountId: account.id,
  });

  revalidateMeetingPaths();
}

export async function disconnectCalendarAction(accountId: string) {
  const session = await requireSession();
  const account = await prisma.calendarAccount.findFirst({
    where: { id: accountId, userId: session.user.id },
  });
  if (!account) {
    throw new Error("Calendar account not found.");
  }

  await prisma.calendarAccount.update({
    where: { id: account.id },
    data: { status: "disconnected", accessToken: null, refreshToken: null },
  });
  revalidateMeetingPaths();
}

export async function refreshDemoCalendarAction(accountId: string) {
  const session = await requireSession();
  const account = await prisma.calendarAccount.findFirst({
    where: { id: accountId, userId: session.user.id, provider: "demo" },
  });
  if (!account) {
    throw new Error("Calendar account not found.");
  }

  await seedDemoEvents({
    workspaceId: session.user.workspaceId,
    userId: session.user.id,
    calendarAccountId: account.id,
  });
  revalidateMeetingPaths();
}

async function ensureEventInWorkspace(workspaceId: string, eventId: string) {
  const event = await prisma.calendarEvent.findFirst({
    where: { id: eventId, workspaceId },
  });
  if (!event) {
    throw new Error("Calendar event not found.");
  }
  return event;
}

export async function confirmEventCompanyAction(
  eventId: string,
  formData: FormData,
) {
  const session = await requireSession();
  const event = await ensureEventInWorkspace(session.user.workspaceId, eventId);

  const companyId = String(formData.get("companyId") ?? "").trim();
  const contactIdRaw = formData.get("contactId");
  const contactId = typeof contactIdRaw === "string" && contactIdRaw.trim() ? contactIdRaw.trim() : null;

  if (!companyId) {
    throw new Error("Pick a company to link this meeting to.");
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, workspaceId: session.user.workspaceId },
  });
  if (!company) {
    throw new Error("Company not found in this workspace.");
  }

  if (contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, companyId: company.id },
    });
    if (!contact) {
      throw new Error("Contact does not belong to the chosen company.");
    }
  }

  await prisma.calendarEvent.update({
    where: { id: event.id },
    data: {
      companyId: company.id,
      contactId,
      linkStatus: "confirmed",
    },
  });

  await recordActivity({
    companyId: company.id,
    actorId: session.user.id,
    kind: "calendar_linked",
    summary: `Linked calendar meeting: ${event.title}`,
    metadata: { calendarEventId: event.id, startsAt: event.startsAt.toISOString() },
  });
  await touchCompany(company.id);
  revalidateMeetingPaths(company.id);
}

export async function skipEventAction(eventId: string) {
  const session = await requireSession();
  const event = await ensureEventInWorkspace(session.user.workspaceId, eventId);

  await prisma.calendarEvent.update({
    where: { id: event.id },
    data: { linkStatus: "skipped", companyId: null, contactId: null },
  });
  revalidateMeetingPaths(event.companyId ?? undefined);
}

export async function logMeetingAction(eventId: string) {
  const session = await requireSession();
  const event = await ensureEventInWorkspace(session.user.workspaceId, eventId);

  if (!event.companyId) {
    throw new Error("Confirm the company link before logging this meeting.");
  }
  if (event.linkStatus !== "confirmed") {
    throw new Error("Confirm the company link before logging this meeting.");
  }

  const attendees = parseAttendees(event.attendees);
  const externalAttendeeNames = attendees
    .filter((attendee) => !attendee.email.endsWith("@graft.systems"))
    .map((attendee) => attendee.name ?? attendee.email);

  const notesLines = [
    `Meeting: ${event.title}`,
    event.location ? `Location: ${event.location}` : null,
    event.meetingUrl ? `Link: ${event.meetingUrl}` : null,
    externalAttendeeNames.length > 0 ? `Attendees: ${externalAttendeeNames.join(", ")}` : null,
    event.description ? `\n${event.description}` : null,
  ].filter(Boolean);

  const interaction = await prisma.interaction.upsert({
    where: { calendarEventId: event.id },
    update: {
      companyId: event.companyId,
      contactId: event.contactId,
      type: "meeting",
      occurredAt: event.startsAt,
      notes: notesLines.join("\n"),
      source: "calendar",
      createdById: session.user.id,
    },
    create: {
      companyId: event.companyId,
      contactId: event.contactId,
      type: "meeting",
      occurredAt: event.startsAt,
      notes: notesLines.join("\n"),
      source: "calendar",
      calendarEventId: event.id,
      createdById: session.user.id,
    },
  });

  await recordActivity({
    companyId: event.companyId,
    actorId: session.user.id,
    kind: "meeting_logged",
    summary: `Logged meeting from calendar: ${event.title}`,
    metadata: {
      calendarEventId: event.id,
      interactionId: interaction.id,
    },
  });
  await touchCompany(event.companyId);
  revalidateMeetingPaths(event.companyId);
}

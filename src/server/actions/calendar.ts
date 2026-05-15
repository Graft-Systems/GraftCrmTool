"use server";

import { revalidatePath } from "next/cache";

import { parseAttendees } from "@/lib/calendar/attendees";
import { insertPrimaryCalendarEvent } from "@/lib/calendar/google-oauth";
import { seedDemoEvents } from "@/lib/calendar/demo";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { touchCompany } from "@/lib/work/activity";

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

  await prisma.interaction.upsert({
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

  await touchCompany(event.companyId);
  revalidateMeetingPaths(event.companyId);
}

function parseManualAttendees(value: string): { email: string; name?: string }[] {
  return value
    .split(/\r?\n|,/) 
    .map((raw) => raw.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const match = line.match(/^(.+?)\s*<\s*(.+@.+)\s*>$/);
      if (match) {
        return [{ name: match[1].trim(), email: match[2].trim().toLowerCase() }];
      }
      if (/^.+@.+$/.test(line)) {
        return [{ email: line.toLowerCase() }];
      }
      return [];
    });
}

export async function createManualMeetingAction(formData: FormData) {
  const session = await requireSession();
  const userId = session.user.id;
  const workspaceId = session.user.workspaceId;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    throw new Error("Title is required.");
  }
  const startInput = String(formData.get("startsAt") ?? "").trim();
  if (!startInput) {
    throw new Error("Start time is required.");
  }
  const startsAt = new Date(startInput);
  if (Number.isNaN(startsAt.getTime())) {
    throw new Error("Enter a valid start time.");
  }
  const endInput = String(formData.get("endsAt") ?? "").trim();
  let endsAt: Date;
  if (endInput) {
    const parsed = new Date(endInput);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Enter a valid end time.");
    }
    endsAt = parsed;
  } else {
    endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
  }
  if (endsAt <= startsAt) {
    throw new Error("End time must be after start time.");
  }

  const location = String(formData.get("location") ?? "").trim() || null;
  const meetingUrl = String(formData.get("meetingUrl") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const attendeesRaw = String(formData.get("attendees") ?? "");
  const attendees = parseManualAttendees(attendeesRaw);
  const companyIdRaw = String(formData.get("companyId") ?? "").trim();
  const companyId = companyIdRaw || null;

  let confirmedCompanyId: string | null = null;
  if (companyId) {
    const company = await prisma.company.findFirst({
      where: { id: companyId, workspaceId },
    });
    if (!company) {
      throw new Error("Company not found in this workspace.");
    }
    confirmedCompanyId = company.id;
  }

  const account = await prisma.calendarAccount.upsert({
    where: {
      userId_provider_externalAccountId: {
        userId,
        provider: "manual",
        externalAccountId: "manual-entries",
      },
    },
    update: { status: "connected", displayName: "Manual entries" },
    create: {
      userId,
      provider: "manual",
      externalAccountId: "manual-entries",
      displayName: "Manual entries",
      status: "connected",
    },
  });

  const externalId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  await prisma.calendarEvent.create({
    data: {
      workspaceId,
      calendarAccountId: account.id,
      externalId,
      title,
      startsAt,
      endsAt,
      description,
      location,
      meetingUrl,
      attendees,
      organizerEmail: null,
      companyId: confirmedCompanyId,
      contactId: null,
      linkStatus: confirmedCompanyId ? "confirmed" : "unmatched",
    },
  });

  if (confirmedCompanyId) {
    await touchCompany(confirmedCompanyId);
  }
  revalidateMeetingPaths(confirmedCompanyId ?? undefined);
}

export async function createGoogleScheduledMeetingAction(formData: FormData) {
  const session = await requireSession();
  const userId = session.user.id;
  const workspaceId = session.user.workspaceId;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    throw new Error("Title is required.");
  }
  const startInput = String(formData.get("startsAt") ?? "").trim();
  if (!startInput) {
    throw new Error("Start time is required.");
  }
  const startsAt = new Date(startInput);
  if (Number.isNaN(startsAt.getTime())) {
    throw new Error("Enter a valid start time.");
  }
  const endInput = String(formData.get("endsAt") ?? "").trim();
  let endsAt: Date;
  if (endInput) {
    const parsed = new Date(endInput);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Enter a valid end time.");
    }
    endsAt = parsed;
  } else {
    endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
  }
  if (endsAt <= startsAt) {
    throw new Error("End time must be after start time.");
  }

  const location = String(formData.get("location") ?? "").trim() || null;
  const meetingUrl = String(formData.get("meetingUrl") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const companyIdRaw = String(formData.get("companyId") ?? "").trim();
  let confirmedCompanyId: string | null = null;
  if (companyIdRaw) {
    const company = await prisma.company.findFirst({
      where: { id: companyIdRaw, workspaceId },
    });
    if (!company) {
      throw new Error("Company not found in this workspace.");
    }
    confirmedCompanyId = company.id;
  }

  const attendeeIds = formData
    .getAll("attendeeIds")
    .filter((value): value is string => typeof value === "string")
    .map((id) => id.trim())
    .filter(Boolean);

  if (attendeeIds.length === 0) {
    throw new Error("Choose at least one teammate to invite.");
  }

  const invitees = await prisma.user.findMany({
    where: {
      id: { in: attendeeIds },
      workspaceId,
    },
    select: { id: true, email: true, name: true },
  });

  if (invitees.length !== attendeeIds.length) {
    throw new Error("One or more selected teammates are not in this workspace.");
  }

  const account = await prisma.calendarAccount.findFirst({
    where: {
      userId,
      provider: "google",
      status: "connected",
      refreshToken: { not: null },
    },
  });

  if (!account) {
    throw new Error("Connect Google Calendar in Settings before scheduling invites.");
  }

  const attendees = invitees.map((u) => ({
    email: u.email.toLowerCase(),
    displayName: u.name,
  }));

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  let created;
  try {
    created = await insertPrimaryCalendarEvent(account, {
      title,
      description,
      startsAt,
      endsAt,
      location,
      meetingUrl,
      attendees,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Google Calendar request failed.";
    throw new Error(message);
  }

  const apiAttendees = created.attendees ?? [];
  const attendeesJson = apiAttendees.flatMap((a) => {
    if (!a?.email) return [];
    return [{ email: a.email, name: a.displayName ?? null, responseStatus: a.responseStatus ?? null }];
  });

  await prisma.calendarEvent.create({
    data: {
      workspaceId,
      calendarAccountId: account.id,
      externalId: created.id!,
      title,
      description,
      startsAt,
      endsAt,
      location,
      meetingUrl: created.hangoutLink ?? meetingUrl,
      organizerEmail: me?.email ?? session.user.email ?? null,
      attendees: attendeesJson,
      companyId: confirmedCompanyId,
      contactId: null,
      linkStatus: confirmedCompanyId ? "confirmed" : "unmatched",
    },
  });

  if (confirmedCompanyId) {
    await touchCompany(confirmedCompanyId);
  }
  revalidateMeetingPaths(confirmedCompanyId ?? undefined);
}

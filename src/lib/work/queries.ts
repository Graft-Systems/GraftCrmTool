import type { Prisma } from "@/generated/prisma/client";

import type { InboxView } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { endOfDay, endOfWeek, startOfDay } from "@/lib/crm";

const taskInclude = {
  company: {
    select: {
      id: true,
      name: true,
    },
  },
  contact: {
    select: {
      id: true,
      name: true,
    },
  },
  deal: {
    select: {
      id: true,
      name: true,
    },
  },
  pilot: {
    select: {
      id: true,
      name: true,
    },
  },
  owner: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.FollowUpTaskInclude;

function openTaskWhere(workspaceId: string): Prisma.FollowUpTaskWhereInput {
  return {
    status: "open",
    company: { workspaceId },
  };
}

export async function listInboxTasks(
  workspaceId: string,
  view: InboxView,
  currentUserId: string,
) {
  const where: Prisma.FollowUpTaskWhereInput = openTaskWhere(workspaceId);
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = endOfWeek(now);

  switch (view) {
    case "my":
      where.ownerId = currentUserId;
      break;
    case "overdue":
      where.dueAt = { lt: todayStart };
      break;
    case "today":
      where.dueAt = {
        gte: todayStart,
        lte: todayEnd,
      };
      break;
    case "week":
      where.dueAt = {
        gte: todayStart,
        lte: weekEnd,
      };
      break;
    case "unassigned":
      where.ownerId = null;
      break;
  }

  return prisma.followUpTask.findMany({
    where,
    include: taskInclude,
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
  });
}

export async function listCompanyTasks(companyId: string) {
  return prisma.followUpTask.findMany({
    where: { companyId },
    include: taskInclude,
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
  });
}

export async function listCompanyInteractions(companyId: string) {
  return prisma.interaction.findMany({
    where: { companyId },
    include: {
      contact: {
        select: {
          id: true,
          name: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function getInboxCounts(workspaceId: string, currentUserId: string) {
  const base = openTaskWhere(workspaceId);
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = endOfWeek(now);

  const [my, overdue, today, week, unassigned] = await Promise.all([
    prisma.followUpTask.count({
      where: { ...base, ownerId: currentUserId },
    }),
    prisma.followUpTask.count({
      where: { ...base, dueAt: { lt: todayStart } },
    }),
    prisma.followUpTask.count({
      where: { ...base, dueAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.followUpTask.count({
      where: { ...base, dueAt: { gte: todayStart, lte: weekEnd } },
    }),
    prisma.followUpTask.count({
      where: { ...base, ownerId: null },
    }),
  ]);

  return { my, overdue, today, week, unassigned };
}

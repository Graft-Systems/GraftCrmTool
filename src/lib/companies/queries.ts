import type { Prisma } from "@/generated/prisma/client";

import { OPEN_DEAL_STAGES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { parseTags } from "@/lib/crm";

export type CompanyListFilters = {
  q?: string;
  stageId?: string;
  tag?: string;
  ownerId?: string;
  staleDays?: number;
};

export async function listCompanies(
  workspaceId: string,
  filters: CompanyListFilters = {},
) {
  const where: Prisma.CompanyWhereInput = {
    workspaceId,
  };

  if (filters.stageId) {
    where.relationshipStageId = filters.stageId;
  }

  if (filters.ownerId) {
    where.accountOwnerId = filters.ownerId;
  }

  if (filters.staleDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - filters.staleDays);
    where.updatedAt = { lt: cutoff };
  }

  if (filters.q) {
    const query = filters.q.trim();
    if (query) {
      where.OR = [
        { name: { contains: query } },
        { domain: { contains: query } },
        { description: { contains: query } },
        { needs: { contains: query } },
        {
          contacts: {
            some: {
              OR: [
                { name: { contains: query } },
                { email: { contains: query } },
                { notes: { contains: query } },
              ],
            },
          },
        },
      ];
    }
  }

  const companies = await prisma.company.findMany({
    where,
    include: {
      relationshipStage: true,
      accountOwner: true,
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
      },
      _count: {
        select: {
          followUpTasks: {
            where: { status: "open" },
          },
          deals: {
            where: { stage: { in: [...OPEN_DEAL_STAGES] } },
          },
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });

  if (!filters.tag) {
    return companies;
  }

  const tag = filters.tag.trim().toLowerCase();
  return companies.filter((company) =>
    parseTags(company.tags).some((value) => value.toLowerCase() === tag),
  );
}

export async function getCompany(workspaceId: string, companyId: string) {
  return prisma.company.findFirst({
    where: {
      id: companyId,
      workspaceId,
    },
    include: {
      relationshipStage: true,
      accountOwner: true,
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
      },
    },
  });
}

export async function listWorkspaceUsers(workspaceId: string) {
  return prisma.user.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
  });
}

export async function listRelationshipStages(workspaceId: string) {
  return prisma.relationshipStage.findMany({
    where: { workspaceId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function listKnownTags(workspaceId: string) {
  const companies = await prisma.company.findMany({
    where: { workspaceId },
    select: { tags: true },
  });

  const tags = new Set<string>();
  for (const company of companies) {
    for (const tag of parseTags(company.tags)) {
      tags.add(tag);
    }
  }

  return [...tags].sort((a, b) => a.localeCompare(b));
}

/** Minimal list for dropdowns (competitions / investors add-from-pipeline). */
export async function listCompanySelectOptions(workspaceId: string) {
  return prisma.company.findMany({
    where: { workspaceId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

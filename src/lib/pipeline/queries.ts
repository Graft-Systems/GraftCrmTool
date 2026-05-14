import type { Prisma } from "@/generated/prisma/client";

import { ACTIVE_PILOT_STATUSES, OPEN_DEAL_STAGES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { parseTags } from "@/lib/crm";

const ownerSelect = {
  id: true,
  name: true,
  email: true,
} as const;

const companySelect = {
  id: true,
  name: true,
} as const;

export type DealListFilters = {
  stage?: string;
  ownerId?: string;
  openOnly?: boolean;
};

export type PilotListFilters = {
  status?: string;
  ownerId?: string;
  activeOnly?: boolean;
};

export type InvestorListFilters = {
  stage?: string;
};

export type PartnerListFilters = {
  programStatus?: string;
  ownerId?: string;
};

export type WineryListFilters = {
  region?: string;
  distributionModel?: string;
};

export async function listCompanyDeals(companyId: string) {
  return prisma.deal.findMany({
    where: { companyId },
    include: { owner: { select: ownerSelect } },
    orderBy: [{ stage: "asc" }, { updatedAt: "desc" }],
  });
}

export async function listCompanyPilots(companyId: string) {
  return prisma.pilot.findMany({
    where: { companyId },
    include: {
      owner: { select: ownerSelect },
      deal: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
}

export async function getCompanyInvestorProfile(companyId: string) {
  return prisma.investorProfile.findUnique({
    where: { companyId },
  });
}

export async function getCompanyPartnerProfile(companyId: string) {
  return prisma.partnerProfile.findUnique({
    where: { companyId },
    include: { owner: { select: ownerSelect } },
  });
}

export async function getCompanyWineryProfile(companyId: string) {
  const profile = await prisma.wineryProfile.findUnique({
    where: { companyId },
  });

  if (!profile) {
    return null;
  }

  return { ...profile, varietals: parseTags(profile.varietals) };
}

export async function listWineries(workspaceId: string, filters: WineryListFilters = {}) {
  const where: Prisma.WineryProfileWhereInput = {
    company: { workspaceId },
  };

  if (filters.region) {
    where.region = { contains: filters.region };
  }

  if (filters.distributionModel) {
    where.distributionModel = filters.distributionModel;
  }

  const profiles = await prisma.wineryProfile.findMany({
    where,
    include: {
      company: { select: companySelect },
    },
    orderBy: [{ region: "asc" }, { updatedAt: "desc" }],
  });

  return profiles.map((profile) => ({
    ...profile,
    varietals: parseTags(profile.varietals),
  }));
}

export async function listDeals(workspaceId: string, filters: DealListFilters = {}) {
  const where: Prisma.DealWhereInput = {
    company: { workspaceId },
  };

  if (filters.ownerId) {
    where.ownerId = filters.ownerId;
  }

  if (filters.stage) {
    where.stage = filters.stage;
  } else if (filters.openOnly) {
    where.stage = { in: [...OPEN_DEAL_STAGES] };
  }

  return prisma.deal.findMany({
    where,
    include: {
      company: { select: companySelect },
      owner: { select: ownerSelect },
    },
    orderBy: [{ expectedClose: "asc" }, { updatedAt: "desc" }],
  });
}

export async function listPilots(workspaceId: string, filters: PilotListFilters = {}) {
  const where: Prisma.PilotWhereInput = {
    company: { workspaceId },
  };

  if (filters.ownerId) {
    where.ownerId = filters.ownerId;
  }

  if (filters.status) {
    where.status = filters.status;
  } else if (filters.activeOnly) {
    where.status = { in: [...ACTIVE_PILOT_STATUSES] };
  }

  return prisma.pilot.findMany({
    where,
    include: {
      company: { select: companySelect },
      owner: { select: ownerSelect },
      deal: { select: { id: true, name: true } },
    },
    orderBy: [{ targetEndAt: "asc" }, { updatedAt: "desc" }],
  });
}

export async function listInvestors(workspaceId: string, filters: InvestorListFilters = {}) {
  const where: Prisma.InvestorProfileWhereInput = {
    company: { workspaceId },
  };

  if (filters.stage) {
    where.stage = filters.stage;
  }

  const profiles = await prisma.investorProfile.findMany({
    where,
    include: {
      company: { select: companySelect },
    },
    orderBy: [{ stage: "asc" }, { updatedAt: "desc" }],
  });

  return profiles.map((profile) => ({
    ...profile,
    thesisTags: parseTags(profile.thesisTags),
  }));
}

export async function listPartners(workspaceId: string, filters: PartnerListFilters = {}) {
  const where: Prisma.PartnerProfileWhereInput = {
    company: { workspaceId },
  };

  if (filters.programStatus) {
    where.programStatus = filters.programStatus;
  }

  if (filters.ownerId) {
    where.ownerId = filters.ownerId;
  }

  return prisma.partnerProfile.findMany({
    where,
    include: {
      company: { select: companySelect },
      owner: { select: ownerSelect },
    },
    orderBy: [{ programStatus: "asc" }, { updatedAt: "desc" }],
  });
}

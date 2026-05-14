"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  DEAL_STAGES,
  INVESTOR_STAGES,
  PARTNER_PROGRAM_STATUSES,
  PILOT_STATUSES,
  TASTING_ROOM_STATUSES,
  WINE_DISTRIBUTION_MODELS,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import { tagsToJson } from "@/lib/crm";
import { recordActivity, touchCompany } from "@/lib/work/activity";
import { requireSession } from "@/lib/session";

const dealStageValues = DEAL_STAGES.map((item) => item.value);
const pilotStatusValues = PILOT_STATUSES.map((item) => item.value);
const investorStageValues = INVESTOR_STAGES.map((item) => item.value);
const partnerStatusValues = PARTNER_PROGRAM_STATUSES.map((item) => item.value);
const wineDistributionValues = WINE_DISTRIBUTION_MODELS.map((item) => item.value);
const tastingRoomValues = TASTING_ROOM_STATUSES.map((item) => item.value);

const dealSchema = z.object({
  name: z.string().trim().min(1, "Deal name is required."),
  stage: z
    .string()
    .refine(
      (value) => (dealStageValues as readonly string[]).includes(value),
      "Invalid deal stage.",
    ),
  valueEstimate: z.string().trim().optional(),
  expectedClose: z.string().trim().optional(),
  ownerId: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

const pilotSchema = z.object({
  name: z.string().trim().min(1, "Pilot name is required."),
  status: z
    .string()
    .refine(
      (value) => (pilotStatusValues as readonly string[]).includes(value),
      "Invalid pilot status.",
    ),
  dealId: z.string().trim().optional(),
  startAt: z.string().trim().optional(),
  targetEndAt: z.string().trim().optional(),
  successCriteria: z.string().trim().optional(),
  ownerId: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

const investorSchema = z.object({
  fundName: z.string().trim().optional(),
  checkSizeBand: z.string().trim().optional(),
  thesisTags: z.string().trim().optional(),
  warmIntroSource: z.string().trim().optional(),
  stage: z
    .string()
    .refine(
      (value) => (investorStageValues as readonly string[]).includes(value),
      "Invalid investor stage.",
    ),
  nextStep: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

const partnerSchema = z.object({
  partnerType: z.string().trim().optional(),
  programStatus: z
    .string()
    .refine(
      (value) => (partnerStatusValues as readonly string[]).includes(value),
      "Invalid partner program status.",
    ),
  ownerId: z.string().trim().optional(),
  integrationNotes: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

const winerySchema = z.object({
  region: z.string().trim().optional(),
  varietals: z.string().trim().optional(),
  annualProductionCases: z.string().trim().optional(),
  distributionModel: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || (wineDistributionValues as readonly string[]).includes(value),
      "Invalid distribution model.",
    ),
  tastingRoomStatus: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || (tastingRoomValues as readonly string[]).includes(value),
      "Invalid tasting room status.",
    ),
  winemakerName: z.string().trim().optional(),
  established: z.string().trim().optional(),
  websiteShop: z.string().trim().optional(),
  nextStep: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

function varietalsFromInput(value?: string) {
  if (!value) {
    return tagsToJson([]);
  }

  return tagsToJson(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function optionalIntFromInput(value: string | undefined, fieldLabel: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value.replace(/,/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    throw new Error(`Enter a valid whole number for ${fieldLabel}.`);
  }

  return parsed;
}

function thesisTagsFromInput(value?: string) {
  if (!value) {
    return tagsToJson([]);
  }

  return tagsToJson(
    value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  );
}

function assertValid<T>(
  result: { success: true; data: T } | { success: false; error: z.ZodError },
  fallback: string,
): T {
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? fallback);
  }

  return result.data;
}

function parseDateInput(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Enter a valid date.");
  }

  return parsed;
}

function parseOptionalNumber(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error("Enter a valid number.");
  }

  return parsed;
}

function revalidatePipelinePaths(companyId?: string) {
  revalidatePath("/deals");
  revalidatePath("/pilots");
  revalidatePath("/investors");
  revalidatePath("/partners");
  revalidatePath("/wineries");
  revalidatePath("/companies");
  if (companyId) {
    revalidatePath(`/companies/${companyId}`);
  }
}

async function getCompanyForWorkspace(workspaceId: string, companyId: string) {
  return prisma.company.findFirst({
    where: { id: companyId, workspaceId },
  });
}

async function assertDealForCompany(companyId: string, dealId?: string) {
  if (!dealId) {
    return null;
  }

  const deal = await prisma.deal.findFirst({
    where: { id: dealId, companyId },
  });

  if (!deal) {
    throw new Error("Deal not found.");
  }

  return deal;
}

export async function createDealAction(companyId: string, formData: FormData) {
  const session = await requireSession();
  const parsed = assertValid(
    dealSchema.safeParse({
      name: formData.get("name"),
      stage: formData.get("stage") || "open",
      valueEstimate: formData.get("valueEstimate") || undefined,
      expectedClose: formData.get("expectedClose") || undefined,
      ownerId: formData.get("ownerId") || undefined,
      notes: formData.get("notes") || undefined,
    }),
    "Invalid deal data.",
  );

  const company = await getCompanyForWorkspace(session.user.workspaceId, companyId);
  if (!company) {
    throw new Error("Company not found.");
  }

  const deal = await prisma.deal.create({
    data: {
      companyId,
      name: parsed.name,
      stage: parsed.stage,
      valueEstimate: parseOptionalNumber(parsed.valueEstimate),
      expectedClose: parseDateInput(parsed.expectedClose),
      ownerId: parsed.ownerId || null,
      notes: parsed.notes || null,
    },
  });

  await recordActivity({
    companyId,
    actorId: session.user.id,
    kind: "deal_created",
    summary: `Created deal: ${deal.name}`,
    metadata: { dealId: deal.id, stage: deal.stage },
  });
  await touchCompany(companyId);
  revalidatePipelinePaths(companyId);
}

export async function updateDealAction(dealId: string, formData: FormData) {
  const session = await requireSession();
  const parsed = assertValid(
    dealSchema.safeParse({
      name: formData.get("name"),
      stage: formData.get("stage") || "open",
      valueEstimate: formData.get("valueEstimate") || undefined,
      expectedClose: formData.get("expectedClose") || undefined,
      ownerId: formData.get("ownerId") || undefined,
      notes: formData.get("notes") || undefined,
    }),
    "Invalid deal data.",
  );

  const deal = await prisma.deal.findFirst({
    where: {
      id: dealId,
      company: { workspaceId: session.user.workspaceId },
    },
  });

  if (!deal) {
    throw new Error("Deal not found.");
  }

  const updated = await prisma.deal.update({
    where: { id: dealId },
    data: {
      name: parsed.name,
      stage: parsed.stage,
      valueEstimate: parseOptionalNumber(parsed.valueEstimate),
      expectedClose: parseDateInput(parsed.expectedClose),
      ownerId: parsed.ownerId || null,
      notes: parsed.notes || null,
    },
  });

  await recordActivity({
    companyId: deal.companyId,
    actorId: session.user.id,
    kind: "deal_updated",
    summary: `Updated deal: ${updated.name} (${updated.stage})`,
    metadata: { dealId: updated.id, stage: updated.stage },
  });
  await touchCompany(deal.companyId);
  revalidatePipelinePaths(deal.companyId);
}

export async function createPilotAction(companyId: string, formData: FormData) {
  const session = await requireSession();
  const parsed = assertValid(
    pilotSchema.safeParse({
      name: formData.get("name"),
      status: formData.get("status") || "planned",
      dealId: formData.get("dealId") || undefined,
      startAt: formData.get("startAt") || undefined,
      targetEndAt: formData.get("targetEndAt") || undefined,
      successCriteria: formData.get("successCriteria") || undefined,
      ownerId: formData.get("ownerId") || undefined,
      notes: formData.get("notes") || undefined,
    }),
    "Invalid pilot data.",
  );

  const company = await getCompanyForWorkspace(session.user.workspaceId, companyId);
  if (!company) {
    throw new Error("Company not found.");
  }

  await assertDealForCompany(companyId, parsed.dealId);

  const pilot = await prisma.pilot.create({
    data: {
      companyId,
      dealId: parsed.dealId || null,
      name: parsed.name,
      status: parsed.status,
      startAt: parseDateInput(parsed.startAt),
      targetEndAt: parseDateInput(parsed.targetEndAt),
      successCriteria: parsed.successCriteria || null,
      ownerId: parsed.ownerId || null,
      notes: parsed.notes || null,
    },
  });

  await recordActivity({
    companyId,
    actorId: session.user.id,
    kind: "pilot_created",
    summary: `Created pilot: ${pilot.name}`,
    metadata: { pilotId: pilot.id, status: pilot.status },
  });
  await touchCompany(companyId);
  revalidatePipelinePaths(companyId);
}

export async function updatePilotAction(pilotId: string, formData: FormData) {
  const session = await requireSession();
  const parsed = assertValid(
    pilotSchema.safeParse({
      name: formData.get("name"),
      status: formData.get("status") || "planned",
      dealId: formData.get("dealId") || undefined,
      startAt: formData.get("startAt") || undefined,
      targetEndAt: formData.get("targetEndAt") || undefined,
      successCriteria: formData.get("successCriteria") || undefined,
      ownerId: formData.get("ownerId") || undefined,
      notes: formData.get("notes") || undefined,
    }),
    "Invalid pilot data.",
  );

  const pilot = await prisma.pilot.findFirst({
    where: {
      id: pilotId,
      company: { workspaceId: session.user.workspaceId },
    },
  });

  if (!pilot) {
    throw new Error("Pilot not found.");
  }

  await assertDealForCompany(pilot.companyId, parsed.dealId);

  const updated = await prisma.pilot.update({
    where: { id: pilotId },
    data: {
      dealId: parsed.dealId || null,
      name: parsed.name,
      status: parsed.status,
      startAt: parseDateInput(parsed.startAt),
      targetEndAt: parseDateInput(parsed.targetEndAt),
      successCriteria: parsed.successCriteria || null,
      ownerId: parsed.ownerId || null,
      notes: parsed.notes || null,
    },
  });

  await recordActivity({
    companyId: pilot.companyId,
    actorId: session.user.id,
    kind: "pilot_updated",
    summary: `Updated pilot: ${updated.name} (${updated.status})`,
    metadata: { pilotId: updated.id, status: updated.status },
  });
  await touchCompany(pilot.companyId);
  revalidatePipelinePaths(pilot.companyId);
}

export async function upsertInvestorProfileAction(companyId: string, formData: FormData) {
  const session = await requireSession();
  const parsed = assertValid(
    investorSchema.safeParse({
      fundName: formData.get("fundName") || undefined,
      checkSizeBand: formData.get("checkSizeBand") || undefined,
      thesisTags: formData.get("thesisTags") || undefined,
      warmIntroSource: formData.get("warmIntroSource") || undefined,
      stage: formData.get("stage") || "prospecting",
      nextStep: formData.get("nextStep") || undefined,
      notes: formData.get("notes") || undefined,
    }),
    "Invalid investor profile data.",
  );

  const company = await getCompanyForWorkspace(session.user.workspaceId, companyId);
  if (!company) {
    throw new Error("Company not found.");
  }

  const profile = await prisma.investorProfile.upsert({
    where: { companyId },
    update: {
      fundName: parsed.fundName || null,
      checkSizeBand: parsed.checkSizeBand || null,
      thesisTags: thesisTagsFromInput(parsed.thesisTags),
      warmIntroSource: parsed.warmIntroSource || null,
      stage: parsed.stage,
      nextStep: parsed.nextStep || null,
      notes: parsed.notes || null,
    },
    create: {
      companyId,
      fundName: parsed.fundName || null,
      checkSizeBand: parsed.checkSizeBand || null,
      thesisTags: thesisTagsFromInput(parsed.thesisTags),
      warmIntroSource: parsed.warmIntroSource || null,
      stage: parsed.stage,
      nextStep: parsed.nextStep || null,
      notes: parsed.notes || null,
    },
  });

  await recordActivity({
    companyId,
    actorId: session.user.id,
    kind: "investor_updated",
    summary: `Updated investor profile (${profile.stage})`,
    metadata: { investorProfileId: profile.id, stage: profile.stage },
  });
  await touchCompany(companyId);
  revalidatePipelinePaths(companyId);
}

export async function upsertPartnerProfileAction(companyId: string, formData: FormData) {
  const session = await requireSession();
  const parsed = assertValid(
    partnerSchema.safeParse({
      partnerType: formData.get("partnerType") || undefined,
      programStatus: formData.get("programStatus") || "exploring",
      ownerId: formData.get("ownerId") || undefined,
      integrationNotes: formData.get("integrationNotes") || undefined,
      notes: formData.get("notes") || undefined,
    }),
    "Invalid partner profile data.",
  );

  const company = await getCompanyForWorkspace(session.user.workspaceId, companyId);
  if (!company) {
    throw new Error("Company not found.");
  }

  const profile = await prisma.partnerProfile.upsert({
    where: { companyId },
    update: {
      partnerType: parsed.partnerType || null,
      programStatus: parsed.programStatus,
      ownerId: parsed.ownerId || null,
      integrationNotes: parsed.integrationNotes || null,
      notes: parsed.notes || null,
    },
    create: {
      companyId,
      partnerType: parsed.partnerType || null,
      programStatus: parsed.programStatus,
      ownerId: parsed.ownerId || null,
      integrationNotes: parsed.integrationNotes || null,
      notes: parsed.notes || null,
    },
  });

  await recordActivity({
    companyId,
    actorId: session.user.id,
    kind: "partner_updated",
    summary: `Updated partner profile (${profile.programStatus})`,
    metadata: { partnerProfileId: profile.id, programStatus: profile.programStatus },
  });
  await touchCompany(companyId);
  revalidatePipelinePaths(companyId);
}

export async function upsertWineryProfileAction(companyId: string, formData: FormData) {
  const session = await requireSession();
  const parsed = assertValid(
    winerySchema.safeParse({
      region: formData.get("region") || undefined,
      varietals: formData.get("varietals") || undefined,
      annualProductionCases: formData.get("annualProductionCases") || undefined,
      distributionModel: formData.get("distributionModel") || undefined,
      tastingRoomStatus: formData.get("tastingRoomStatus") || undefined,
      winemakerName: formData.get("winemakerName") || undefined,
      established: formData.get("established") || undefined,
      websiteShop: formData.get("websiteShop") || undefined,
      nextStep: formData.get("nextStep") || undefined,
      notes: formData.get("notes") || undefined,
    }),
    "Invalid winery profile data.",
  );

  const company = await getCompanyForWorkspace(session.user.workspaceId, companyId);
  if (!company) {
    throw new Error("Company not found.");
  }

  const annualProductionCases = optionalIntFromInput(parsed.annualProductionCases, "annual production");
  const established = optionalIntFromInput(parsed.established, "year established");

  const data = {
    region: parsed.region || null,
    varietals: varietalsFromInput(parsed.varietals),
    annualProductionCases,
    distributionModel: parsed.distributionModel || null,
    tastingRoomStatus: parsed.tastingRoomStatus || null,
    winemakerName: parsed.winemakerName || null,
    established,
    websiteShop: parsed.websiteShop || null,
    nextStep: parsed.nextStep || null,
    notes: parsed.notes || null,
  };

  const profile = await prisma.wineryProfile.upsert({
    where: { companyId },
    update: data,
    create: { companyId, ...data },
  });

  await recordActivity({
    companyId,
    actorId: session.user.id,
    kind: "winery_updated",
    summary: `Updated winery profile${profile.region ? ` (${profile.region})` : ""}`,
    metadata: { wineryProfileId: profile.id, region: profile.region ?? undefined },
  });
  await touchCompany(companyId);
  revalidatePipelinePaths(companyId);
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  DEAL_STAGES,
  INVESTOR_STAGES,
  PARTNER_PROGRAM_STATUSES,
  PILOT_STATUSES,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import { tagsToJson } from "@/lib/crm";
import { touchCompany } from "@/lib/work/activity";
import { requireSession } from "@/lib/session";

const dealStageValues = DEAL_STAGES.map((item) => item.value);
const pilotStatusValues = PILOT_STATUSES.map((item) => item.value);
const investorStageValues = INVESTOR_STAGES.map((item) => item.value);
const partnerStatusValues = PARTNER_PROGRAM_STATUSES.map((item) => item.value);

const dealSchema = z.object({
  name: z.string().trim().min(1, "Competition name is required."),
  stage: z
    .string()
    .refine(
      (value) => (dealStageValues as readonly string[]).includes(value),
      "Invalid stage.",
    ),
  valueEstimate: z.string().trim().optional(),
  expectedClose: z.string().trim().optional(),
  startsAt: z.string().trim().optional(),
  endsAt: z.string().trim().optional(),
  link: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || /^https?:\/\//i.test(value),
      "Link must start with http:// or https://",
    ),
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
  revalidatePath("/investors");
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

function dealDataFromParsed(parsed: ReturnType<typeof dealSchema.parse>) {
  return {
    name: parsed.name,
    stage: parsed.stage,
    valueEstimate: parseOptionalNumber(parsed.valueEstimate),
    expectedClose: parseDateInput(parsed.expectedClose),
    startsAt: parseDateInput(parsed.startsAt),
    endsAt: parseDateInput(parsed.endsAt),
    link: parsed.link || null,
    ownerId: parsed.ownerId || null,
    notes: parsed.notes || null,
  };
}

function parseDealForm(formData: FormData) {
  return assertValid(
    dealSchema.safeParse({
      name: formData.get("name"),
      stage: formData.get("stage") || "open",
      valueEstimate: formData.get("valueEstimate") || undefined,
      expectedClose: formData.get("expectedClose") || undefined,
      startsAt: formData.get("startsAt") || undefined,
      endsAt: formData.get("endsAt") || undefined,
      link: formData.get("link") || undefined,
      ownerId: formData.get("ownerId") || undefined,
      notes: formData.get("notes") || undefined,
    }),
    "Invalid competition data.",
  );
}

export async function createDealAction(companyId: string, formData: FormData) {
  const session = await requireSession();
  const parsed = parseDealForm(formData);

  const company = await getCompanyForWorkspace(session.user.workspaceId, companyId);
  if (!company) {
    throw new Error("Company not found.");
  }

  await prisma.deal.create({
    data: {
      workspaceId: company.workspaceId,
      companyId: company.id,
      ...dealDataFromParsed(parsed),
    },
  });

  await touchCompany(companyId);
  revalidatePipelinePaths(companyId);
}

/** Reads optional `companyId` from the form — competition can exist without a company. */
export async function createDealWithCompanyPickerAction(formData: FormData) {
  const session = await requireSession();
  const parsed = parseDealForm(formData);
  const raw = formData.get("companyId");
  const companyId = typeof raw === "string" && raw.trim() ? raw.trim() : null;

  if (companyId) {
    const company = await getCompanyForWorkspace(session.user.workspaceId, companyId);
    if (!company) {
      throw new Error("Company not found.");
    }
  }

  await prisma.deal.create({
    data: {
      workspaceId: session.user.workspaceId,
      companyId,
      ...dealDataFromParsed(parsed),
    },
  });

  if (companyId) {
    await touchCompany(companyId);
  }
  revalidatePipelinePaths(companyId ?? undefined);
}

export async function updateDealAction(dealId: string, formData: FormData) {
  const session = await requireSession();
  const parsed = parseDealForm(formData);

  const deal = await prisma.deal.findFirst({
    where: {
      id: dealId,
      workspaceId: session.user.workspaceId,
    },
  });

  if (!deal) {
    throw new Error("Competition not found.");
  }

  await prisma.deal.update({
    where: { id: dealId },
    data: dealDataFromParsed(parsed),
  });

  if (deal.companyId) {
    await touchCompany(deal.companyId);
  }
  revalidatePipelinePaths(deal.companyId ?? undefined);
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

  await prisma.pilot.create({
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

  await prisma.pilot.update({
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

  await prisma.investorProfile.upsert({
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

  await touchCompany(companyId);
  revalidatePipelinePaths(companyId);
}

/** Same as upsertInvestorProfileAction; reads `companyId` from the form (Investors page). */
export async function upsertInvestorWithCompanyPickerAction(formData: FormData) {
  const raw = formData.get("companyId");
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("Choose a company.");
  }
  await upsertInvestorProfileAction(raw.trim(), formData);
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

  await prisma.partnerProfile.upsert({
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

  await touchCompany(companyId);
  revalidatePipelinePaths(companyId);
}


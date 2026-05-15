"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createWisprIngest } from "@/lib/wispr/ingest";
import { seedDemoWisprIngests } from "@/lib/wispr/demo";
import { INTERACTION_TYPES } from "@/lib/constants";
import { parseTags, tagsToJson } from "@/lib/crm";
import { prisma } from "@/lib/db";
import { touchCompany } from "@/lib/work/activity";
import { requireSession } from "@/lib/session";

const interactionTypeValues = INTERACTION_TYPES.map((item) => item.value);

const simulateNoteSchema = z.object({
  rawText: z.string().trim().min(1, "Paste a Wispr note before saving."),
  externalNoteId: z.string().trim().optional(),
});

const applyIngestSchema = z.object({
  companyId: z.string().trim().min(1, "Pick a company."),
  contactId: z.string().trim().optional(),
  type: z
    .string()
    .refine(
      (value) => (interactionTypeValues as readonly string[]).includes(value),
      "Invalid interaction type.",
    ),
  occurredAt: z.string().trim().min(1, "Date is required."),
  summary: z.string().trim().min(1, "Summary is required."),
  needsBullets: z.string().trim().optional(),
  applyNeeds: z.boolean(),
  tagHints: z.string().trim().optional(),
  applyTags: z.boolean(),
  stageHint: z.string().trim().optional(),
});

function assertValid<T>(
  result: { success: true; data: T } | { success: false; error: z.ZodError },
  fallback: string,
): T {
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? fallback);
  }

  return result.data;
}

function parseDateInput(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Enter a valid date.");
  }
  return parsed;
}

function parseNeedsBullets(value?: string) {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function parseTagHints(value?: string) {
  if (!value) return [];
  return value
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function revalidateWisprPaths(companyId?: string) {
  revalidatePath("/wispr");
  revalidatePath("/settings");
  revalidatePath("/inbox");
  if (companyId) {
    revalidatePath(`/companies/${companyId}`);
  }
}

export async function connectDemoWisprAction() {
  const session = await requireSession();

  const connection = await prisma.wisprConnection.upsert({
    where: { userId: session.user.id },
    update: {
      provider: "demo",
      status: "connected",
      displayName: "Demo Wispr",
      connectedAt: new Date(),
    },
    create: {
      userId: session.user.id,
      provider: "demo",
      status: "connected",
      displayName: "Demo Wispr",
    },
  });

  await seedDemoWisprIngests({
    workspaceId: session.user.workspaceId,
    wisprConnectionId: connection.id,
  });

  revalidateWisprPaths();
}

export async function disconnectWisprAction() {
  const session = await requireSession();
  const existing = await prisma.wisprConnection.findUnique({
    where: { userId: session.user.id },
  });
  if (!existing) return;

  await prisma.wisprConnection.update({
    where: { id: existing.id },
    data: { status: "disconnected", apiKey: null, webhookSecret: null },
  });
  revalidateWisprPaths();
}

export async function simulateWisprNoteAction(formData: FormData) {
  const session = await requireSession();
  const parsed = assertValid(
    simulateNoteSchema.safeParse({
      rawText: formData.get("rawText"),
      externalNoteId: formData.get("externalNoteId") || undefined,
    }),
    "Invalid Wispr note.",
  );

  let connection = await prisma.wisprConnection.findUnique({
    where: { userId: session.user.id },
  });
  if (!connection) {
    connection = await prisma.wisprConnection.create({
      data: {
        userId: session.user.id,
        provider: "demo",
        status: "connected",
        displayName: "Demo Wispr",
      },
    });
  }

  await createWisprIngest({
    workspaceId: session.user.workspaceId,
    wisprConnectionId: connection.id,
    externalNoteId: parsed.externalNoteId || `manual-${Date.now()}`,
    rawText: parsed.rawText,
    receivedAt: new Date(),
  });

  revalidateWisprPaths();
}

export async function applyWisprIngestAction(ingestId: string, formData: FormData) {
  const session = await requireSession();
  const ingest = await prisma.wisprIngest.findFirst({
    where: { id: ingestId, workspaceId: session.user.workspaceId },
  });
  if (!ingest) {
    throw new Error("Wispr ingest not found.");
  }
  if (ingest.status === "applied") {
    throw new Error("This ingest has already been applied.");
  }

  const parsed = assertValid(
    applyIngestSchema.safeParse({
      companyId: formData.get("companyId"),
      contactId: formData.get("contactId") || undefined,
      type: formData.get("type"),
      occurredAt: formData.get("occurredAt"),
      summary: formData.get("summary"),
      needsBullets: formData.get("needsBullets") || undefined,
      applyNeeds: formData.get("applyNeeds") === "on",
      tagHints: formData.get("tagHints") || undefined,
      applyTags: formData.get("applyTags") === "on",
      stageHint: formData.get("stageHint") || undefined,
    }),
    "Invalid Wispr review data.",
  );

  const company = await prisma.company.findFirst({
    where: { id: parsed.companyId, workspaceId: session.user.workspaceId },
  });
  if (!company) {
    throw new Error("Company not found in this workspace.");
  }

  if (parsed.contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: parsed.contactId, companyId: company.id },
    });
    if (!contact) {
      throw new Error("Contact does not belong to the chosen company.");
    }
  }

  const needsBullets = parseNeedsBullets(parsed.needsBullets);
  const tagHints = parseTagHints(parsed.tagHints);
  const aiSuggestedTasks = Array.isArray(ingest.aiSuggestedTasks)
    ? (ingest.aiSuggestedTasks as Array<{ title?: string; description?: string; dueInDays?: number }>)
    : [];

  const interaction = await prisma.interaction.create({
    data: {
      companyId: company.id,
      contactId: parsed.contactId || null,
      type: parsed.type,
      occurredAt: parseDateInput(parsed.occurredAt),
      notes: parsed.summary,
      source: "wispr_api",
      transcript: ingest.rawText,
      aiSummary: parsed.summary,
      aiNeeds: needsBullets,
      aiSuggestedTasks,
      aiStageHint: parsed.stageHint || null,
      aiTagHints: tagHints,
      createdById: session.user.id,
    },
  });

  if (parsed.applyNeeds && needsBullets.length > 0) {
    await prisma.company.update({
      where: { id: company.id },
      data: { needs: needsBullets.map((bullet) => `- ${bullet}`).join("\n") },
    });
  }

  if (parsed.applyTags && tagHints.length > 0) {
    const mergedTags = tagsToJson([...parseTags(company.tags), ...tagHints]);
    await prisma.company.update({
      where: { id: company.id },
      data: { tags: mergedTags },
    });
  }

  for (const task of aiSuggestedTasks) {
    if (!task.title) continue;
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + (task.dueInDays ?? 3));

    await prisma.followUpTask.create({
      data: {
        companyId: company.id,
        contactId: parsed.contactId || null,
        interactionId: interaction.id,
        title: task.title,
        description: task.description || null,
        status: "open",
        dueAt,
        ownerId: session.user.id,
        createdById: session.user.id,
      },
    });
  }

  await prisma.wisprIngest.update({
    where: { id: ingest.id },
    data: {
      status: "applied",
      appliedInteractionId: interaction.id,
      suggestedCompanyId: company.id,
    },
  });

  await touchCompany(company.id);
  revalidateWisprPaths(company.id);
}

export async function discardWisprIngestAction(ingestId: string) {
  const session = await requireSession();
  const ingest = await prisma.wisprIngest.findFirst({
    where: { id: ingestId, workspaceId: session.user.workspaceId },
  });
  if (!ingest) {
    throw new Error("Wispr ingest not found.");
  }

  await prisma.wisprIngest.update({
    where: { id: ingest.id },
    data: { status: "discarded" },
  });
  revalidateWisprPaths();
}

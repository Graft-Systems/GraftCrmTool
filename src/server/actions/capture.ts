"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { structureCapture } from "@/lib/ai/structure-capture";
import type { CaptureSource, StructuredCapture } from "@/lib/ai/types";
import { INTERACTION_SOURCES, INTERACTION_TYPES } from "@/lib/constants";
import { parseTags, tagsToJson } from "@/lib/crm";
import { prisma } from "@/lib/db";
import { listRelationshipStages } from "@/lib/companies/queries";
import { touchCompany } from "@/lib/work/activity";
import { requireSession } from "@/lib/session";

const interactionTypeValues = INTERACTION_TYPES.map((item) => item.value);
const interactionSourceValues = INTERACTION_SOURCES.map((item) => item.value);

const structureCaptureSchema = z.object({
  source: z
    .string()
    .refine(
      (value) => value === "in_app_voice" || value === "paste",
      "Invalid capture source.",
    ),
  transcript: z.string().trim().min(1, "Add notes before structuring."),
});

const reviewTaskSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  dueInDays: z.number().int().min(0).max(365).optional(),
  selected: z.boolean(),
});

const applyCaptureReviewSchema = z.object({
  source: z
    .string()
    .refine(
      (value) => (interactionSourceValues as readonly string[]).includes(value),
      "Invalid capture source.",
    ),
  transcript: z.string().trim().min(1, "Transcript is required."),
  type: z
    .string()
    .refine(
      (value) => (interactionTypeValues as readonly string[]).includes(value),
      "Invalid interaction type.",
    ),
  occurredAt: z.string().trim().min(1, "Date is required."),
  contactId: z.string().trim().optional(),
  summary: z.string().trim().min(1, "Summary is required."),
  needsBullets: z.string().trim().optional(),
  applyNeeds: z.boolean(),
  tagHints: z.string().trim().optional(),
  applyTags: z.boolean(),
  stageHint: z.string().trim().optional(),
  tasksPayload: z.string().trim().optional(),
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

function revalidateCapturePaths(companyId: string) {
  revalidatePath("/inbox");
  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
}

function parseNeedsBullets(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function parseTagHints(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseReviewTasks(value?: string) {
  if (!value) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Invalid task payload.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid task payload.");
  }

  return parsed
    .map((item) => reviewTaskSchema.safeParse(item))
    .filter((result): result is { success: true; data: z.infer<typeof reviewTaskSchema> } => {
      return result.success;
    })
    .map((result) => result.data)
    .filter((task) => task.selected);
}

async function getCompanyForWorkspace(workspaceId: string, companyId: string) {
  return prisma.company.findFirst({
    where: { id: companyId, workspaceId },
    include: {
      relationshipStage: true,
    },
  });
}

export async function structureCaptureAction(
  companyId: string,
  input: { source: CaptureSource; transcript: string },
): Promise<StructuredCapture> {
  const session = await requireSession();
  const parsed = assertValid(structureCaptureSchema.safeParse(input), "Invalid capture input.");

  const [company, stages] = await Promise.all([
    getCompanyForWorkspace(session.user.workspaceId, companyId),
    listRelationshipStages(session.user.workspaceId),
  ]);

  if (!company) {
    throw new Error("Company not found.");
  }

  return structureCapture(parsed.transcript, {
    companyName: company.name,
    needs: company.needs,
    tags: parseTags(company.tags),
    stageKeys: stages.map((stage) => stage.key),
  }, parsed.source as CaptureSource);
}

export async function applyCaptureReviewAction(companyId: string, formData: FormData) {
  const session = await requireSession();
  const parsed = assertValid(
    applyCaptureReviewSchema.safeParse({
      source: formData.get("source"),
      transcript: formData.get("transcript"),
      type: formData.get("type"),
      occurredAt: formData.get("occurredAt"),
      contactId: formData.get("contactId") || undefined,
      summary: formData.get("summary"),
      needsBullets: formData.get("needsBullets") || undefined,
      applyNeeds: formData.get("applyNeeds") === "on",
      tagHints: formData.get("tagHints") || undefined,
      applyTags: formData.get("applyTags") === "on",
      stageHint: formData.get("stageHint") || undefined,
      tasksPayload: formData.get("tasksPayload") || undefined,
    }),
    "Invalid capture review data.",
  );

  const company = await getCompanyForWorkspace(session.user.workspaceId, companyId);
  if (!company) {
    throw new Error("Company not found.");
  }

  if (parsed.contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: parsed.contactId, companyId },
    });
    if (!contact) {
      throw new Error("Contact not found.");
    }
  }

  const needsBullets = parseNeedsBullets(parsed.needsBullets);
  const tagHints = parseTagHints(parsed.tagHints);
  const selectedTasks = parseReviewTasks(parsed.tasksPayload);

  const interaction = await prisma.interaction.create({
    data: {
      companyId,
      contactId: parsed.contactId || null,
      type: parsed.type,
      occurredAt: parseDateInput(parsed.occurredAt) ?? new Date(),
      notes: parsed.summary,
      source: parsed.source,
      transcript: parsed.transcript,
      aiSummary: parsed.summary,
      aiNeeds: needsBullets,
      aiSuggestedTasks: selectedTasks.map((task) => ({
        title: task.title,
        description: task.description,
        dueInDays: task.dueInDays,
      })),
      aiStageHint: parsed.stageHint || null,
      aiTagHints: tagHints,
      createdById: session.user.id,
    },
  });

  if (parsed.applyNeeds && needsBullets.length > 0) {
    const formattedNeeds = needsBullets.map((bullet) => `- ${bullet}`).join("\n");
    await prisma.company.update({
      where: { id: companyId },
      data: { needs: formattedNeeds },
    });
  }

  if (parsed.applyTags && tagHints.length > 0) {
    const mergedTags = tagsToJson([...parseTags(company.tags), ...tagHints]);
    await prisma.company.update({
      where: { id: companyId },
      data: { tags: mergedTags },
    });
  }

  for (const task of selectedTasks) {
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + (task.dueInDays ?? 3));

    await prisma.followUpTask.create({
      data: {
        companyId,
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

  await touchCompany(companyId);
  revalidateCapturePaths(companyId);
}

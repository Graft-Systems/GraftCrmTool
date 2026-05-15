"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { INTERACTION_TYPES, TASK_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { touchCompany } from "@/lib/work/activity";
import { requireSession } from "@/lib/session";

const interactionTypeValues = INTERACTION_TYPES.map((item) => item.value);
const taskStatusValues = TASK_STATUSES.map((item) => item.value);

const needsSchema = z.object({
  needs: z.string().trim().optional(),
});

const interactionSchema = z.object({
  type: z
    .string()
    .refine(
      (value) => (interactionTypeValues as readonly string[]).includes(value),
      "Invalid interaction type.",
    ),
  occurredAt: z.string().trim().min(1, "Date is required."),
  notes: z.string().trim().optional(),
  contactId: z.string().trim().optional(),
});

const taskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required."),
  description: z.string().trim().optional(),
  status: z
    .string()
    .refine(
      (value) => (taskStatusValues as readonly string[]).includes(value),
      "Invalid task status.",
    )
    .optional(),
  dueAt: z.string().trim().optional(),
  ownerId: z.string().trim().optional(),
  contactId: z.string().trim().optional(),
  dealId: z.string().trim().optional(),
  pilotId: z.string().trim().optional(),
  interactionId: z.string().trim().optional(),
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

function revalidateWorkPaths(companyId?: string) {
  revalidatePath("/inbox");
  revalidatePath("/companies");
  revalidatePath("/deals");
  revalidatePath("/pilots");
  if (companyId) {
    revalidatePath(`/companies/${companyId}`);
  }
}

const commentSchema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty.").max(2000),
  interactionId: z.string().trim().optional(),
});

async function getCompanyForWorkspace(workspaceId: string, companyId: string) {
  return prisma.company.findFirst({
    where: { id: companyId, workspaceId },
  });
}

export async function updateCompanyNeedsAction(companyId: string, formData: FormData) {
  const session = await requireSession();
  const parsed = assertValid(
    needsSchema.safeParse({
      needs: formData.get("needs") || undefined,
    }),
    "Invalid needs data.",
  );

  const company = await getCompanyForWorkspace(session.user.workspaceId, companyId);
  if (!company) {
    throw new Error("Company not found.");
  }

  await prisma.company.update({
    where: { id: companyId },
    data: { needs: parsed.needs || null },
  });

  await touchCompany(companyId);
  revalidateWorkPaths(companyId);
}

export async function createInteractionAction(companyId: string, formData: FormData) {
  const session = await requireSession();
  const parsed = assertValid(
    interactionSchema.safeParse({
      type: formData.get("type"),
      occurredAt: formData.get("occurredAt"),
      notes: formData.get("notes") || undefined,
      contactId: formData.get("contactId") || undefined,
    }),
    "Invalid interaction data.",
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

  await prisma.interaction.create({
    data: {
      companyId,
      contactId: parsed.contactId || null,
      type: parsed.type,
      occurredAt: parseDateInput(parsed.occurredAt) ?? new Date(),
      notes: parsed.notes || null,
      createdById: session.user.id,
    },
  });

  await touchCompany(companyId);
  revalidateWorkPaths(companyId);
}

export async function createTaskAction(companyId: string, formData: FormData) {
  const session = await requireSession();
  const parsed = assertValid(
    taskSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      status: formData.get("status") || "open",
      dueAt: formData.get("dueAt") || undefined,
      ownerId: formData.get("ownerId") || undefined,
      contactId: formData.get("contactId") || undefined,
      dealId: formData.get("dealId") || undefined,
      pilotId: formData.get("pilotId") || undefined,
      interactionId: formData.get("interactionId") || undefined,
    }),
    "Invalid task data.",
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

  if (parsed.interactionId) {
    const interaction = await prisma.interaction.findFirst({
      where: { id: parsed.interactionId, companyId },
    });
    if (!interaction) {
      throw new Error("Interaction not found.");
    }
  }

  if (parsed.dealId) {
    const deal = await prisma.deal.findFirst({
      where: { id: parsed.dealId, companyId },
    });
    if (!deal) {
      throw new Error("Deal not found.");
    }
  }

  if (parsed.pilotId) {
    const pilot = await prisma.pilot.findFirst({
      where: { id: parsed.pilotId, companyId },
    });
    if (!pilot) {
      throw new Error("Pilot not found.");
    }
  }

  await prisma.followUpTask.create({
    data: {
      companyId,
      contactId: parsed.contactId || null,
      dealId: parsed.dealId || null,
      pilotId: parsed.pilotId || null,
      interactionId: parsed.interactionId || null,
      title: parsed.title,
      description: parsed.description || null,
      status: parsed.status ?? "open",
      dueAt: parseDateInput(parsed.dueAt),
      ownerId: parsed.ownerId || null,
      createdById: session.user.id,
    },
  });

  await touchCompany(companyId);
  revalidateWorkPaths(companyId);
}

export async function updateTaskAction(taskId: string, formData: FormData) {
  const session = await requireSession();
  const parsed = assertValid(
    taskSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      status: formData.get("status") || "open",
      dueAt: formData.get("dueAt") || undefined,
      ownerId: formData.get("ownerId") || undefined,
      contactId: formData.get("contactId") || undefined,
      dealId: formData.get("dealId") || undefined,
      pilotId: formData.get("pilotId") || undefined,
    }),
    "Invalid task data.",
  );

  const task = await prisma.followUpTask.findFirst({
    where: {
      id: taskId,
      company: { workspaceId: session.user.workspaceId },
    },
  });

  if (!task) {
    throw new Error("Task not found.");
  }

  if (parsed.contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: parsed.contactId, companyId: task.companyId },
    });
    if (!contact) {
      throw new Error("Contact not found.");
    }
  }

  if (parsed.dealId) {
    const deal = await prisma.deal.findFirst({
      where: { id: parsed.dealId, companyId: task.companyId },
    });
    if (!deal) {
      throw new Error("Deal not found.");
    }
  }

  if (parsed.pilotId) {
    const pilot = await prisma.pilot.findFirst({
      where: { id: parsed.pilotId, companyId: task.companyId },
    });
    if (!pilot) {
      throw new Error("Pilot not found.");
    }
  }

  const nextOwnerId = parsed.ownerId || null;
  await prisma.followUpTask.update({
    where: { id: taskId },
    data: {
      title: parsed.title,
      description: parsed.description || null,
      status: parsed.status ?? "open",
      dueAt: parseDateInput(parsed.dueAt),
      ownerId: nextOwnerId,
      contactId: parsed.contactId || null,
      dealId: parsed.dealId || null,
      pilotId: parsed.pilotId || null,
    },
  });

  await touchCompany(task.companyId);
  revalidateWorkPaths(task.companyId);
}

export async function reassignTaskAction(taskId: string, formData: FormData) {
  const session = await requireSession();
  const ownerInput = (formData.get("ownerId") as string | null)?.trim() ?? "";
  const nextOwnerId = ownerInput ? ownerInput : null;

  if (nextOwnerId) {
    const owner = await prisma.user.findFirst({
      where: { id: nextOwnerId, workspaceId: session.user.workspaceId },
      select: { id: true },
    });
    if (!owner) {
      throw new Error("Owner not found in this workspace.");
    }
  }

  const task = await prisma.followUpTask.findFirst({
    where: { id: taskId, company: { workspaceId: session.user.workspaceId } },
    select: { id: true, companyId: true, title: true, ownerId: true },
  });
  if (!task) {
    throw new Error("Task not found.");
  }
  if (task.ownerId === nextOwnerId) {
    return;
  }

  await prisma.followUpTask.update({
    where: { id: taskId },
    data: { ownerId: nextOwnerId },
  });

  await touchCompany(task.companyId);
  revalidateWorkPaths(task.companyId);
}

export async function createCommentAction(companyId: string, formData: FormData) {
  const session = await requireSession();
  const parsed = assertValid(
    commentSchema.safeParse({
      body: formData.get("body"),
      interactionId: formData.get("interactionId") || undefined,
    }),
    "Invalid comment.",
  );

  const company = await getCompanyForWorkspace(session.user.workspaceId, companyId);
  if (!company) {
    throw new Error("Company not found.");
  }

  if (parsed.interactionId) {
    const interaction = await prisma.interaction.findFirst({
      where: { id: parsed.interactionId, companyId },
      select: { id: true },
    });
    if (!interaction) {
      throw new Error("Interaction not found.");
    }
  }

  await prisma.comment.create({
    data: {
      workspaceId: session.user.workspaceId,
      companyId,
      interactionId: parsed.interactionId || null,
      authorId: session.user.id,
      body: parsed.body,
    },
  });

  await touchCompany(companyId);
  revalidateWorkPaths(companyId);
}

export async function deleteCommentAction(commentId: string) {
  const session = await requireSession();
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, workspaceId: session.user.workspaceId },
    select: { id: true, authorId: true, companyId: true },
  });
  if (!comment) {
    throw new Error("Comment not found.");
  }
  if (comment.authorId !== session.user.id && session.user.role !== "admin") {
    throw new Error("You can only delete your own comments.");
  }

  await prisma.comment.delete({ where: { id: commentId } });
  await touchCompany(comment.companyId);
  revalidateWorkPaths(comment.companyId);
}

export async function completeTaskAction(taskId: string, _formData: FormData) {
  const session = await requireSession();

  const task = await prisma.followUpTask.findFirst({
    where: {
      id: taskId,
      company: { workspaceId: session.user.workspaceId },
    },
  });

  if (!task) {
    throw new Error("Task not found.");
  }

  if (task.status === "done") {
    return;
  }

  await prisma.followUpTask.update({
    where: { id: taskId },
    data: { status: "done" },
  });

  await touchCompany(task.companyId);
  revalidateWorkPaths(task.companyId);
}

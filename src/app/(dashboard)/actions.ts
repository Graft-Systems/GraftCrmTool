"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { tagsToJson } from "@/lib/crm";
import { requireSession } from "@/lib/session";

const companySchema = z.object({
  name: z.string().trim().min(1, "Company name is required."),
  website: z.string().trim().optional(),
  domain: z.string().trim().optional(),
  description: z.string().trim().optional(),
  needs: z.string().trim().optional(),
  relationshipStageId: z.string().trim().optional(),
  accountOwnerId: z.string().trim().min(1, "Owner is required."),
  tags: z.array(z.string()).optional(),
});

const contactSchema = z.object({
  name: z.string().trim().min(1, "Contact name is required."),
  email: z
    .string()
    .trim()
    .transform((value) => (value === "" ? undefined : value))
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: "Enter a valid email address.",
    }),
  phone: z.string().trim().optional(),
  linkedinUrl: z.string().trim().optional(),
  title: z.string().trim().optional(),
  contactRole: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  isPrimary: z.boolean().optional(),
});

const stageLabelSchema = z.object({
  stageId: z.string().trim().min(1),
  label: z.string().trim().min(1, "Stage label is required."),
});

function revalidateCompanyPaths(companyId?: string) {
  revalidatePath("/companies");
  revalidatePath("/settings");
  if (companyId) {
    revalidatePath(`/companies/${companyId}`);
    revalidatePath(`/companies/${companyId}/edit`);
  }
}

function assertValid<T>(result: { success: true; data: T } | { success: false; error: z.ZodError }, fallback: string): T {
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? fallback);
  }

  return result.data;
}

export async function createCompanyAction(formData: FormData) {
  const session = await requireSession();
  const parsed = assertValid(
    companySchema.safeParse({
      name: formData.get("name"),
      website: formData.get("website") || undefined,
      domain: formData.get("domain") || undefined,
      description: formData.get("description") || undefined,
      needs: formData.get("needs") || undefined,
      relationshipStageId: formData.get("relationshipStageId") || undefined,
      accountOwnerId: formData.get("accountOwnerId"),
      tags: String(formData.get("tags") || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    }),
    "Invalid company data.",
  );

  const company = await prisma.company.create({
    data: {
      workspaceId: session.user.workspaceId,
      name: parsed.name,
      website: parsed.website || null,
      domain: parsed.domain || null,
      description: parsed.description || null,
      needs: parsed.needs || null,
      relationshipStageId: parsed.relationshipStageId || null,
      accountOwnerId: parsed.accountOwnerId,
      tags: tagsToJson(parsed.tags ?? []),
    },
  });

  revalidateCompanyPaths(company.id);
  redirect(`/companies/${company.id}`);
}

export async function updateCompanyAction(companyId: string, formData: FormData) {
  const session = await requireSession();
  const parsed = assertValid(
    companySchema.safeParse({
      name: formData.get("name"),
      website: formData.get("website") || undefined,
      domain: formData.get("domain") || undefined,
      description: formData.get("description") || undefined,
      needs: formData.get("needs") || undefined,
      relationshipStageId: formData.get("relationshipStageId") || undefined,
      accountOwnerId: formData.get("accountOwnerId"),
      tags: String(formData.get("tags") || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    }),
    "Invalid company data.",
  );

  const existing = await prisma.company.findFirst({
    where: {
      id: companyId,
      workspaceId: session.user.workspaceId,
    },
  });

  if (!existing) {
    throw new Error("Company not found.");
  }

  await prisma.company.update({
    where: { id: companyId },
    data: {
      name: parsed.name,
      website: parsed.website || null,
      domain: parsed.domain || null,
      description: parsed.description || null,
      needs: parsed.needs || null,
      relationshipStageId: parsed.relationshipStageId || null,
      accountOwnerId: parsed.accountOwnerId,
      tags: tagsToJson(parsed.tags ?? []),
    },
  });

  revalidateCompanyPaths(companyId);
  redirect(`/companies/${companyId}`);
}

export async function deleteCompanyAction(companyId: string, _formData: FormData) {
  const session = await requireSession();

  const existing = await prisma.company.findFirst({
    where: {
      id: companyId,
      workspaceId: session.user.workspaceId,
    },
  });

  if (!existing) {
    throw new Error("Company not found.");
  }

  await prisma.company.delete({ where: { id: companyId } });
  revalidateCompanyPaths();
  redirect("/companies");
}

export async function createContactAction(companyId: string, formData: FormData) {
  const session = await requireSession();
  const parsed = assertValid(
    contactSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email") || undefined,
      phone: formData.get("phone") || undefined,
      linkedinUrl: formData.get("linkedinUrl") || undefined,
      title: formData.get("title") || undefined,
      contactRole: formData.get("contactRole") || undefined,
      notes: formData.get("notes") || undefined,
      isPrimary: formData.get("isPrimary") === "on",
    }),
    "Invalid contact data.",
  );

  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      workspaceId: session.user.workspaceId,
    },
  });

  if (!company) {
    throw new Error("Company not found.");
  }

  if (parsed.isPrimary) {
    await prisma.contact.updateMany({
      where: { companyId },
      data: { isPrimary: false },
    });
  }

  await prisma.contact.create({
    data: {
      companyId,
      name: parsed.name,
      email: parsed.email || null,
      phone: parsed.phone || null,
      linkedinUrl: parsed.linkedinUrl || null,
      title: parsed.title || null,
      contactRole: parsed.contactRole || null,
      notes: parsed.notes || null,
      isPrimary: parsed.isPrimary ?? false,
    },
  });

  revalidateCompanyPaths(companyId);
}

export async function updateContactAction(contactId: string, formData: FormData) {
  const session = await requireSession();
  const parsed = assertValid(
    contactSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email") || undefined,
      phone: formData.get("phone") || undefined,
      linkedinUrl: formData.get("linkedinUrl") || undefined,
      title: formData.get("title") || undefined,
      contactRole: formData.get("contactRole") || undefined,
      notes: formData.get("notes") || undefined,
      isPrimary: formData.get("isPrimary") === "on",
    }),
    "Invalid contact data.",
  );

  const contact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      company: {
        workspaceId: session.user.workspaceId,
      },
    },
    include: { company: true },
  });

  if (!contact) {
    throw new Error("Contact not found.");
  }

  if (parsed.isPrimary) {
    await prisma.contact.updateMany({
      where: {
        companyId: contact.companyId,
        id: { not: contactId },
      },
      data: { isPrimary: false },
    });
  }

  await prisma.contact.update({
    where: { id: contactId },
    data: {
      name: parsed.name,
      email: parsed.email || null,
      phone: parsed.phone || null,
      linkedinUrl: parsed.linkedinUrl || null,
      title: parsed.title || null,
      contactRole: parsed.contactRole || null,
      notes: parsed.notes || null,
      isPrimary: parsed.isPrimary ?? false,
    },
  });

  revalidateCompanyPaths(contact.companyId);
}

export async function deleteContactAction(contactId: string, _formData: FormData) {
  const session = await requireSession();

  const contact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      company: {
        workspaceId: session.user.workspaceId,
      },
    },
  });

  if (!contact) {
    throw new Error("Contact not found.");
  }

  await prisma.contact.delete({ where: { id: contactId } });
  revalidateCompanyPaths(contact.companyId);
}

export async function updateStageLabelAction(formData: FormData) {
  const session = await requireSession();
  const parsed = assertValid(
    stageLabelSchema.safeParse({
      stageId: formData.get("stageId"),
      label: formData.get("label"),
    }),
    "Invalid stage data.",
  );

  const stage = await prisma.relationshipStage.findFirst({
    where: {
      id: parsed.stageId,
      workspaceId: session.user.workspaceId,
    },
  });

  if (!stage) {
    throw new Error("Stage not found.");
  }

  await prisma.relationshipStage.update({
    where: { id: stage.id },
    data: { label: parsed.label },
  });

  revalidatePath("/settings");
  revalidatePath("/companies");
}

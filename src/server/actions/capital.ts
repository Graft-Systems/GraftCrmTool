"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { normalizeSplitBuckets, splitBucketTotalPercent, splitBucketsToJson } from "@/lib/capital/parse";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

const bucketRowSchema = z.object({
  key: z.string().trim().min(1),
  label: z.string().trim().min(1),
  percent: z.number().finite(),
});

const bucketsPayloadSchema = z.array(bucketRowSchema).min(1).max(12);

const receiptSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  amount: z.string().trim().min(1, "Amount is required."),
  source: z.enum(["deal", "investor", "partner", "other"]),
  dealId: z.string().trim().optional(),
  receivedAt: z.string().trim().min(1, "Date is required."),
  notes: z.string().trim().optional(),
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

export async function updateCapitalSplitBucketsAction(formData: FormData) {
  const session = await requireSession();
  const raw = formData.get("bucketsJson");
  if (typeof raw !== "string") {
    throw new Error("Invalid split configuration.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new Error("Split rules must be valid JSON.");
  }

  const parsed = assertValid(bucketsPayloadSchema.safeParse(parsedJson), "Invalid split rows.");
  const normalized = normalizeSplitBuckets(parsed);
  const total = splitBucketTotalPercent(normalized);

  if (Math.abs(total - 100) > 0.05) {
    throw new Error(`Split percentages must total 100% (currently ${total.toFixed(1)}%).`);
  }

  await prisma.workspace.update({
    where: { id: session.user.workspaceId },
    data: { capitalSplitBuckets: splitBucketsToJson(normalized) },
  });

  revalidatePath("/runway");
}

export async function createCapitalReceiptAction(formData: FormData) {
  const session = await requireSession();
  const parsed = assertValid(
    receiptSchema.safeParse({
      title: formData.get("title"),
      amount: formData.get("amount"),
      source: formData.get("source"),
      dealId: formData.get("dealId") || undefined,
      receivedAt: formData.get("receivedAt"),
      notes: formData.get("notes") || undefined,
    }),
    "Invalid receipt data.",
  );

  const amount = Number(parsed.amount.replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter a valid positive amount.");
  }

  const receivedAt = new Date(`${parsed.receivedAt}T12:00:00`);
  if (Number.isNaN(receivedAt.getTime())) {
    throw new Error("Enter a valid received date.");
  }

  if (parsed.dealId) {
    const deal = await prisma.deal.findFirst({
      where: { id: parsed.dealId, workspaceId: session.user.workspaceId },
    });
    if (!deal) {
      throw new Error("Deal not found.");
    }
  }

  await prisma.capitalReceipt.create({
    data: {
      workspaceId: session.user.workspaceId,
      amount,
      title: parsed.title,
      source: parsed.source,
      dealId: parsed.dealId || null,
      receivedAt,
      notes: parsed.notes || null,
      createdById: session.user.id,
    },
  });

  revalidatePath("/runway");
}

export async function deleteCapitalReceiptAction(receiptId: string) {
  const session = await requireSession();
  const receipt = await prisma.capitalReceipt.findFirst({
    where: { id: receiptId, workspaceId: session.user.workspaceId },
  });
  if (!receipt) {
    throw new Error("Receipt not found.");
  }
  await prisma.capitalReceipt.delete({ where: { id: receiptId } });
  revalidatePath("/runway");
}

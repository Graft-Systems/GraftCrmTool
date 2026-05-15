"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { enqueueDigestForUser, runDailyDigestForWorkspace } from "@/lib/email/cron";
import { requireSession } from "@/lib/session";

export async function sendTestDigestAction() {
  const session = await requireSession();
  const result = await enqueueDigestForUser(session.user.id, {
    kind: "test_digest",
    force: true,
  });
  if (!result) {
    throw new Error("Could not build digest for this account.");
  }
  revalidatePath("/settings");
}

export async function runDailyDigestNowAction() {
  const session = await requireSession();
  await runDailyDigestForWorkspace(session.user.workspaceId, { force: false });
  revalidatePath("/settings");
}

export async function deleteDigestAction(digestId: string) {
  const session = await requireSession();
  const digest = await prisma.emailDigest.findFirst({
    where: { id: digestId, workspaceId: session.user.workspaceId },
  });
  if (!digest) {
    throw new Error("Digest not found.");
  }
  await prisma.emailDigest.delete({ where: { id: digestId } });
  revalidatePath("/settings");
}

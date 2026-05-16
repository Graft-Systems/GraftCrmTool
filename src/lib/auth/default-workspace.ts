import { prisma } from "@/lib/db";

const SEED_WORKSPACE_ID = "seed-workspace";

/**
 * Canonical workspace for every member — matches `prisma/seed.ts` (`id: seed-workspace`).
 * Companies, deals, investors, capital receipts, etc. are all scoped by `workspaceId`, so
 * routing sign-ups here keeps one shared dataset for the whole team (never a random empty workspace).
 */
export async function resolveDefaultWorkspaceForSignup() {
  return prisma.workspace.upsert({
    where: { id: SEED_WORKSPACE_ID },
    update: {},
    create: {
      id: SEED_WORKSPACE_ID,
      name: "Graft Systems",
      capitalSplitBuckets: [],
    },
  });
}

export function displayNameFromEmail(email: string): string | null {
  const local = email.split("@")[0];
  if (!local) {
    return null;
  }

  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  return parts
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(" ");
}

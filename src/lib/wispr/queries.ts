import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/db";

const ingestInclude = {
  suggestedCompany: { select: { id: true, name: true } },
  appliedInteraction: { select: { id: true, companyId: true } },
  wisprConnection: { select: { id: true, provider: true, displayName: true, userId: true } },
} satisfies Prisma.WisprIngestInclude;

export type WisprIngestRow = Prisma.WisprIngestGetPayload<{
  include: typeof ingestInclude;
}>;

export async function getWisprConnectionForUser(userId: string) {
  return prisma.wisprConnection.findUnique({
    where: { userId },
  });
}

export async function listWisprIngests(
  workspaceId: string,
  options: { status?: string; mineUserId?: string } = {},
): Promise<WisprIngestRow[]> {
  return prisma.wisprIngest.findMany({
    where: {
      workspaceId,
      ...(options.status ? { status: options.status } : {}),
      ...(options.mineUserId
        ? { wisprConnection: { userId: options.mineUserId } }
        : {}),
    },
    include: ingestInclude,
    orderBy: [{ status: "asc" }, { receivedAt: "desc" }],
  });
}

export async function getWisprIngest(workspaceId: string, ingestId: string) {
  return prisma.wisprIngest.findFirst({
    where: { id: ingestId, workspaceId },
    include: ingestInclude,
  });
}

export async function listWisprIngestsForCompany(
  workspaceId: string,
  companyId: string,
): Promise<WisprIngestRow[]> {
  return prisma.wisprIngest.findMany({
    where: {
      workspaceId,
      OR: [
        { suggestedCompanyId: companyId },
        { appliedInteraction: { companyId } },
      ],
    },
    include: ingestInclude,
    orderBy: [{ status: "asc" }, { receivedAt: "desc" }],
  });
}

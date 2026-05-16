import { prisma } from "@/lib/db";
import { parseSplitBuckets } from "@/lib/capital/parse";

export async function getWorkspaceRunway(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      capitalSplitBuckets: true,
    },
  });

  if (!workspace) {
    return null;
  }

  const receipts = await prisma.capitalReceipt.findMany({
    where: { workspaceId },
    include: {
      deal: {
        select: {
          id: true,
          name: true,
          company: { select: { id: true, name: true } },
        },
      },
      createdBy: {
        select: { name: true, email: true },
      },
    },
    orderBy: { receivedAt: "desc" },
  });

  return {
    workspace,
    splitBuckets: parseSplitBuckets(workspace.capitalSplitBuckets),
    receipts,
  };
}

export async function listWorkspaceDealsForSelect(workspaceId: string) {
  return prisma.deal.findMany({
    where: { workspaceId },
    select: {
      id: true,
      name: true,
      company: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}

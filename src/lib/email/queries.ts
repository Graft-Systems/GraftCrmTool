import { prisma } from "@/lib/db";

export async function listRecentDigests(workspaceId: string, take = 10) {
  return prisma.emailDigest.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      recipient: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function getDigestById(workspaceId: string, digestId: string) {
  return prisma.emailDigest.findFirst({
    where: { id: digestId, workspaceId },
  });
}

import { prisma } from "@/lib/db";

export async function listWorkspaceCompaniesForSelect(workspaceId: string) {
  return prisma.company.findMany({
    where: { workspaceId },
    select: {
      id: true,
      name: true,
      domain: true,
      contacts: {
        select: { id: true, name: true, email: true, isPrimary: true },
        orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
      },
    },
    orderBy: { name: "asc" },
  });
}

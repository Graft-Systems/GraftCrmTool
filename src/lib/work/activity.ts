import { prisma } from "@/lib/db";

export async function touchCompany(companyId: string) {
  return prisma.company.update({
    where: { id: companyId },
    data: { updatedAt: new Date() },
  });
}

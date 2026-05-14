import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/db";

type RecordActivityInput = {
  companyId: string;
  actorId?: string;
  kind: string;
  summary: string;
  metadata?: Prisma.InputJsonValue;
};

export async function recordActivity(input: RecordActivityInput) {
  return prisma.activityEvent.create({
    data: {
      companyId: input.companyId,
      actorId: input.actorId,
      kind: input.kind,
      summary: input.summary,
      metadata: input.metadata,
    },
  });
}

export async function touchCompany(companyId: string) {
  return prisma.company.update({
    where: { id: companyId },
    data: { updatedAt: new Date() },
  });
}

import path from "node:path";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveSqliteUrl(databaseUrl: string) {
  if (!databaseUrl.startsWith("file:")) {
    return databaseUrl;
  }

  const filePath = databaseUrl.slice("file:".length);
  if (path.isAbsolute(filePath)) {
    return databaseUrl;
  }

  return `file:${path.join(process.cwd(), filePath)}`;
}

function createPrismaClient() {
  const databaseUrl = resolveSqliteUrl(env.databaseUrl);

  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}

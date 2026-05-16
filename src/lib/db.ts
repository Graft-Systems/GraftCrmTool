import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

function getPool() {
  const connectionString = env.databaseUrl;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required (PostgreSQL). See README and docker-compose.yml for local setup.",
    );
  }

  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = new Pool({
      connectionString,
      max: Number(process.env.PG_POOL_MAX ?? (env.isProduction ? 5 : 10)),
    });
  }

  return globalForPrisma.pgPool;
}

function createPrismaClient() {
  const pool = getPool();
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}

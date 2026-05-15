import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { runDailyDigestForWorkspace } from "@/lib/email/cron";

export const dynamic = "force-dynamic";

function authorize(request: Request): { ok: boolean; reason?: string } {
  const secret = env.cron.secret;
  if (!secret) {
    if (env.isProduction) {
      return {
        ok: false,
        reason: "CRON_SECRET is not configured. Set it in production to enable this endpoint.",
      };
    }
    return { ok: true };
  }

  const headerToken = request.headers.get("authorization");
  if (headerToken === `Bearer ${secret}`) {
    return { ok: true };
  }

  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  if (queryToken === secret) {
    return { ok: true };
  }

  return { ok: false, reason: "Invalid or missing CRON_SECRET." };
}

async function runForAllWorkspaces(force: boolean) {
  const workspaces = await prisma.workspace.findMany({ select: { id: true, name: true } });
  const results: Array<{
    workspaceId: string;
    workspaceName: string;
    enqueued: number;
    skipped: number;
  }> = [];

  for (const workspace of workspaces) {
    const { enqueued, skipped } = await runDailyDigestForWorkspace(workspace.id, { force });
    results.push({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      enqueued: enqueued.length,
      skipped: skipped.length,
    });
  }

  return results;
}

async function handle(request: Request) {
  const auth = authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason ?? "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";

  const results = await runForAllWorkspaces(force);
  const enqueued = results.reduce((sum, r) => sum + r.enqueued, 0);
  const skipped = results.reduce((sum, r) => sum + r.skipped, 0);

  return NextResponse.json({
    ok: true,
    forced: force,
    summary: { enqueued, skipped, workspaces: results.length },
    workspaces: results,
  });
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}

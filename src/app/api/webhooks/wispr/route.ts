import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { createWisprIngest } from "@/lib/wispr/ingest";
import { prisma } from "@/lib/db";

type WisprWebhookPayload = {
  externalNoteId?: string;
  externalUserId?: string;
  userEmail?: string;
  text?: string;
  receivedAt?: string;
};

function verifySignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const got = signature.startsWith("sha256=") ? signature.slice("sha256=".length) : signature;
  if (expected.length !== got.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(got));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const secret = env.wispr.webhookSecret;
  if (!secret) {
    return NextResponse.json(
      { error: "Wispr webhook is not configured. Set WISPR_WEBHOOK_SECRET to enable." },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-wispr-signature");
  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: WisprWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WisprWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const text = payload.text?.trim();
  const externalNoteId = payload.externalNoteId?.trim();
  if (!text || !externalNoteId) {
    return NextResponse.json({ error: "Missing text or externalNoteId." }, { status: 400 });
  }

  const connection = await (async () => {
    if (payload.externalUserId) {
      return prisma.wisprConnection.findFirst({
        where: { provider: "wispr_api", externalUserId: payload.externalUserId },
      });
    }
    if (payload.userEmail) {
      const user = await prisma.user.findUnique({ where: { email: payload.userEmail } });
      if (!user) return null;
      return prisma.wisprConnection.findUnique({ where: { userId: user.id } });
    }
    return null;
  })();

  if (!connection || connection.status !== "connected") {
    return NextResponse.json(
      { error: "No active Wispr connection for this user." },
      { status: 404 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: connection.userId },
    select: { workspaceId: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User missing workspace." }, { status: 500 });
  }

  const ingest = await createWisprIngest({
    workspaceId: user.workspaceId,
    wisprConnectionId: connection.id,
    externalNoteId,
    rawText: text,
    receivedAt: payload.receivedAt ? new Date(payload.receivedAt) : new Date(),
  });

  await prisma.wisprConnection.update({
    where: { id: connection.id },
    data: { lastSyncedAt: new Date() },
  });

  return NextResponse.json({ ingestId: ingest.id, status: "queued" });
}

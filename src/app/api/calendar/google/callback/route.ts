import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { exchangeCodeForTokens } from "@/lib/calendar/google-oauth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  const reqUrl = new URL(request.url);
  const code = reqUrl.searchParams.get("code");
  const state = reqUrl.searchParams.get("state");
  const oauthError = reqUrl.searchParams.get("error");

  if (oauthError) {
    const detail = reqUrl.searchParams.get("error_description");
    const qs = new URLSearchParams();
    if (oauthError === "access_denied") {
      qs.set("calendar", "google_denied");
    } else {
      qs.set("calendar", "google_oauth");
      qs.set("err", oauthError.slice(0, 120));
      if (detail) {
        qs.set("detail", detail.slice(0, 500));
      }
    }
    return NextResponse.redirect(new URL(`/settings?${qs.toString()}`, request.url));
  }

  if (!session?.user?.id || !code || state !== session.user.id) {
    const why = !session?.user?.id ? "session" : !code ? "missing_code" : "state";
    return NextResponse.redirect(
      new URL(`/settings?calendar=google_state&reason=${why}`, request.url),
    );
  }

  try {
    const { tokens, externalAccountId, displayName } = await exchangeCodeForTokens(code);

    const existing = await prisma.calendarAccount.findUnique({
      where: {
        userId_provider_externalAccountId: {
          userId: session.user.id,
          provider: "google",
          externalAccountId,
        },
      },
    });

    const refreshToken = tokens.refresh_token ?? existing?.refreshToken ?? null;
    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

    if (existing) {
      await prisma.calendarAccount.update({
        where: { id: existing.id },
        data: {
          accessToken: tokens.access_token ?? null,
          refreshToken,
          expiresAt,
          status: "connected",
          displayName,
        },
      });
    } else {
      await prisma.calendarAccount.create({
        data: {
          userId: session.user.id,
          provider: "google",
          externalAccountId,
          accessToken: tokens.access_token ?? null,
          refreshToken,
          expiresAt,
          status: "connected",
          displayName,
        },
      });
    }

    return NextResponse.redirect(new URL("/settings?calendar=google_ok", request.url));
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";
    const qs = new URLSearchParams({ calendar: "google_error", detail: msg.slice(0, 480) });
    return NextResponse.redirect(new URL(`/settings?${qs.toString()}`, request.url));
  }
}

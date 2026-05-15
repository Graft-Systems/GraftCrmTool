import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { buildGoogleConsentUrl } from "@/lib/calendar/google-oauth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const url = buildGoogleConsentUrl(session.user.id);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(new URL("/settings?calendar=google_config", request.url));
  }
}

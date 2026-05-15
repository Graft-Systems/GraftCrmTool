import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    /*
     * Skip auth on static files served from `public/brand/*` (and Next image optimizer via `_next/image`).
     */
    "/((?!api|_next/static|_next/image|favicon.ico|brand/).*)",
  ],
};

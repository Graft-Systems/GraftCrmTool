import type { NextAuthConfig } from "next-auth";

function trimSecret(value: string | undefined): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

/** Edge-safe: do not import `@/lib/env` here — middleware evaluates this bundle. */
const authSecret = trimSecret(process.env.AUTH_SECRET);

export const authConfig = {
  trustHost: true,
  secret: authSecret,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.workspaceId = user.workspaceId;
        token.role = user.role;
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.workspaceId = token.workspaceId as string;
        session.user.role = token.role as string;
      }

      return session;
    },
    authorized: async ({ auth, request }) => {
      const isAuthenticated = !!auth?.user;
      const pathname = request.nextUrl.pathname;
      const isLoginRoute = pathname.startsWith("/login");
      const isWelcomeRoute = pathname.startsWith("/welcome");
      const isPublicAuthRoute = isLoginRoute || isWelcomeRoute;

      if (!isAuthenticated && !isPublicAuthRoute) {
        return false;
      }

      if (isAuthenticated && (isLoginRoute || isWelcomeRoute)) {
        return Response.redirect(new URL("/inbox", request.nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;

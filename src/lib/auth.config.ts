import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
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
      const isLoginRoute = request.nextUrl.pathname.startsWith("/login");

      if (!isAuthenticated && !isLoginRoute) {
        return false;
      }

      if (isAuthenticated && isLoginRoute) {
        return Response.redirect(new URL("/inbox", request.nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;

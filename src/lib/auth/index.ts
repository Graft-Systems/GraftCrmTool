import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authenticateCredentials } from "@/lib/auth/authenticate-credentials";
import { authConfig } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

function sessionUser(user: {
  id: string;
  email: string;
  name: string | null;
  workspaceId: string;
  role: string;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    workspaceId: user.workspaceId,
    role: user.role,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  events: {
    async signIn({ user }) {
      if (!user?.id) {
        return;
      }

      await prisma.user
        .update({
          where: { id: user.id },
          data: { lastSignInAt: new Date() },
        })
        .catch(() => {
          /* ignore */
        });
    },
  },
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" },
      },
      authorize: async (credentials) => {
        const user = await authenticateCredentials(credentials);
        return user ? sessionUser(user) : null;
      },
    }),
  ],
});

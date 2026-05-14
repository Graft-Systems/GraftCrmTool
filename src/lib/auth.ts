import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/db";

const emailSchema = z.string().trim().email();

function getAllowedEmails(): string[] | null {
  const raw = process.env.ALLOWED_EMAILS?.trim();
  if (!raw) {
    return null;
  }

  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function readCredentialEmail(credentials: Partial<Record<string, unknown>> | undefined) {
  const value = credentials?.email;
  if (typeof value !== "string") {
    return null;
  }

  const parsed = emailSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  return parsed.data.toLowerCase();
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      authorize: async (credentials) => {
        const email = readCredentialEmail(credentials);
        if (!email) {
          return null;
        }

        const allowedEmails = getAllowedEmails();
        if (allowedEmails && !allowedEmails.includes(email)) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          workspaceId: user.workspaceId,
          role: user.role,
        };
      },
    }),
  ],
});

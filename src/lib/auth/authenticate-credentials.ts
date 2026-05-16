import { z } from "zod";

import { displayNameFromEmail, resolveDefaultWorkspaceForSignup } from "@/lib/auth/default-workspace";
import { hashPassword, parseCredentialPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

const emailSchema = z.string().email();
const nameSchema = z.string().trim().min(1).max(120);

function pickStr(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return "";
}

function normalizeEmail(value: unknown): string | null {
  const raw = pickStr(value).trim().toLowerCase();
  if (!raw) {
    return null;
  }

  const parsed = emailSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function normalizeName(value: unknown): string | null {
  const raw = pickStr(value).trim();
  if (!raw) {
    return null;
  }

  const parsed = nameSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function credentialDebug(reason: string, detail?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.warn("[graft auth] credentials:", reason, detail ?? {});
}

export async function authenticateCredentials(credentials: Partial<Record<string, unknown>> | undefined) {
  const email = normalizeEmail(credentials?.email);
  const passwordPlain = pickStr(credentials?.password).trim();
  const password = parseCredentialPassword(passwordPlain);
  const name = normalizeName(credentials?.name);

  if (!email || !password) {
    credentialDebug("missing email or invalid password length/schema", {
      hasEmail: Boolean(email),
      passwordLen: passwordPlain.length,
    });
    return null;
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (!existing) {
    if (env.auth.inviteOnly) {
      credentialDebug("invite-only: unknown email", { email });
      return null;
    }

    if (!name) {
      credentialDebug("sign-up missing name", { email });
      return null;
    }

    const workspace = await resolveDefaultWorkspaceForSignup();

    try {
      return await prisma.user.create({
        data: {
          email,
          name,
          passwordHash: await hashPassword(password),
          workspaceId: workspace.id,
          role: "member",
        },
      });
    } catch (error) {
      console.error("[graft auth] user.create failed", error);
      return null;
    }
  }

  if (existing.passwordHash) {
    const ok = await verifyPassword(password, existing.passwordHash);
    if (!ok) {
      credentialDebug("password mismatch", { email });
      return null;
    }

    return existing;
  }

  const fallbackName = !existing.name ? displayNameFromEmail(existing.email) : undefined;
  const resolvedName = name ?? fallbackName;

  try {
    return await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash: await hashPassword(password),
        ...(resolvedName ? { name: resolvedName } : {}),
      },
    });
  } catch (error) {
    console.error("[graft auth] user.update (set password) failed", error);
    return null;
  }
}

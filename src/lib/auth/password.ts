import bcrypt from "bcryptjs";
import { z } from "zod";

import { PASSWORD_MIN_LENGTH } from "@/lib/auth/constants";

const passwordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(200);

export function parseCredentialPassword(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  const parsed = passwordSchema.safeParse(trimmed);
  return parsed.success ? parsed.data : null;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

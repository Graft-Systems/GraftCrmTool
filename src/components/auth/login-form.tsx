"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useMemo, useState } from "react";
import { z } from "zod";

import { GraftLogo } from "@/components/brand/graft-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/constants";

const emailSchema = z.string().trim().toLowerCase().email();

const ERROR_MESSAGES: Record<string, string> = {
  email: "Enter a valid email address.",
  password_short: `Your password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
  name_required:
    "First-time sign-up: enter your full name in the first field. If you already have an account, leave name blank and sign in with your saved password.",
  invite_only:
    "Only people already added to this workspace can sign in. Ask a teammate to invite you, or use an email that's already on the team.",
  invalid_credentials:
    "Wrong email or password. If you're new here, enter your full name in the first field and choose a password (at least 8 characters).",
  invalid: "Couldn't sign you in. Try again.",
};

type LoginFormProps = {
  initialErrorKey?: string | null;
};

export function LoginForm({ initialErrorKey }: LoginFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(() =>
    initialErrorKey && initialErrorKey in ERROR_MESSAGES ? initialErrorKey : null,
  );

  const errorMessage = useMemo(
    () => (errorKey ? (ERROR_MESSAGES[errorKey] ?? ERROR_MESSAGES.invalid) : null),
    [errorKey],
  );

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setErrorKey(null);

    const emailRaw = formData.get("email");
    const passwordRaw = formData.get("password");
    const nameRaw = formData.get("name");

    const emailParsed = emailSchema.safeParse(typeof emailRaw === "string" ? emailRaw : "");
    if (!emailParsed.success) {
      setErrorKey("email");
      setSubmitting(false);
      return;
    }

    const email = emailParsed.data;
    const password = typeof passwordRaw === "string" ? passwordRaw.trim() : "";
    const name = typeof nameRaw === "string" ? nameRaw.trim() : "";

    if (password.length < PASSWORD_MIN_LENGTH) {
      setErrorKey("password_short");
      setSubmitting(false);
      return;
    }

    try {
      const origin = window.location.origin;
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
        ...(name ? { name } : {}),
        callbackUrl: `${origin}/inbox`,
      });

      if (!result) {
        setErrorKey("invalid");
        setSubmitting(false);
        return;
      }

      if (result.error) {
        const err = String(result.error);
        const credFail =
          err === "CredentialsSignin" || err.toLowerCase().includes("credential");
        setErrorKey(credFail ? "invalid_credentials" : "invalid");
        setSubmitting(false);
        return;
      }

      if (result.ok) {
        router.replace("/inbox");
        router.refresh();
        return;
      }

      setErrorKey("invalid");
    } catch {
      setErrorKey("invalid");
    }

    setSubmitting(false);
  }

  return (
    <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-md">
      <GraftLogo />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">Sign in to Graft CRM</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Use your email and password. New to the workspace? Add your name — we&apos;ll create your account on
        first sign-in (unless your team limits sign-up to existing members only). Everyone shares the same
        workspace data.
      </p>
      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      <form
        className="mt-8 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          await handleSubmit(formData);
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Required for your first sign-up"
          />
          <p className="text-xs text-muted-foreground">Returning users can leave this blank.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            placeholder="owner@graft.systems"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Continue"}
        </Button>
      </form>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Everyone chooses their own password. Seeded workspace emails don&apos;t start with a saved password —
        your first successful login stores the password you enter. Re-running{" "}
        <span className="font-mono text-[11px]">npm run db:seed</span> does not reset passwords already set.
      </p>
    </div>
  );
}

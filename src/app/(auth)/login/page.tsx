import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn } from "@/lib/auth";
import { GraftLogo } from "@/components/brand/graft-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function loginAction(formData: FormData) {
  "use server";

  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError && error.type === "CredentialsSignin") {
      redirect("/login?error=invalid");
    }

    throw error;
  }
}

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const showInvalidError = params.error === "invalid";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_100%_-10%,color-mix(in_srgb,var(--graft-mauve)_35%,transparent),transparent_55%),radial-gradient(ellipse_90%_60%_at_-10%_110%,color-mix(in_srgb,var(--graft-navy)_28%,transparent),transparent_50%)]"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-md">
        <GraftLogo />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
          Sign in to Graft CRM
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Use a seeded teammate email for local development.
        </p>
        {showInvalidError ? (
          <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Sign in failed. Use owner@graft.systems or teammate@graft.systems, then run
            npm run db:seed if this is a fresh database.
          </p>
        ) : null}
        <form action={loginAction} className="mt-8 space-y-4">
          <input type="hidden" name="redirectTo" value="/inbox" />
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="owner@graft.systems"
            />
          </div>
          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Seeded users: owner@graft.systems and teammate@graft.systems
        </p>
      </div>
    </div>
  );
}

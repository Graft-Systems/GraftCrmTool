import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn } from "@/lib/auth";
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
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-6">
      <div className="w-full max-w-md rounded-2xl border bg-background p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Graft Systems
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in to Graft CRM</h1>
        <p className="mt-2 text-sm text-muted-foreground">
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
        <p className="mt-4 text-xs text-muted-foreground">
          Seeded users: owner@graft.systems and teammate@graft.systems
        </p>
      </div>
    </div>
  );
}

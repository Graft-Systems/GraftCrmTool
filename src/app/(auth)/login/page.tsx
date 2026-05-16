import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const initialErrorKey = params.error?.trim() ?? null;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_100%_-10%,color-mix(in_srgb,var(--graft-mauve)_35%,transparent),transparent_55%),radial-gradient(ellipse_90%_60%_at_-10%_110%,color-mix(in_srgb,var(--graft-navy)_28%,transparent),transparent_50%)]"
      />
      <LoginForm initialErrorKey={initialErrorKey} />
    </div>
  );
}

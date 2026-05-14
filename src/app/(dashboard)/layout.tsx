import { signOut } from "@/lib/auth";
import { requireSession } from "@/lib/session";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen bg-muted/30">
      <DashboardSidebar
        userName={session.user.name ?? session.user.email ?? "Teammate"}
        userEmail={session.user.email ?? ""}
        signOutAction={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}

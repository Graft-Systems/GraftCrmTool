import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id || !session.user.workspaceId) {
    redirect("/login");
  }

  return session;
}

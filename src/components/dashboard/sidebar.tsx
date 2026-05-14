import Link from "next/link";
import {
  CalendarDays,
  Grape,
  Handshake,
  Inbox,
  Landmark,
  PieChart,
  Settings2,
  Target,
  Trophy,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type DashboardSidebarProps = {
  userName: string;
  userEmail: string;
  signOutAction: () => Promise<void>;
};

export function DashboardSidebar({
  userName,
  userEmail,
  signOutAction,
}: DashboardSidebarProps) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-background">
      <div className="px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Graft Systems
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Graft CRM</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pipeline, arena, and the forge.</p>
      </div>
      <Separator />
      <nav className="flex flex-1 flex-col gap-1 px-4 py-4">
        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Command
        </p>
        <Link href="/deals" className={buttonVariants({ variant: "ghost", className: "justify-start" })}>
          <Target className="size-4" />
          Deals
        </Link>
        <Link href="/companies" className={buttonVariants({ variant: "ghost", className: "justify-start" })}>
          <Trophy className="size-4" />
          The Arena
        </Link>
        <Link href="/wineries" className={buttonVariants({ variant: "ghost", className: "justify-start" })}>
          <Grape className="size-4" />
          Wineries
        </Link>
        <Link href="/investors" className={buttonVariants({ variant: "ghost", className: "justify-start" })}>
          <Landmark className="size-4" />
          Investors
        </Link>
        <Link href="/runway" className={buttonVariants({ variant: "ghost", className: "justify-start" })}>
          <PieChart className="size-4" />
          The Forge
        </Link>

        <Separator className="my-3" />
        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Signal desk
        </p>
        <Link href="/inbox" className={buttonVariants({ variant: "ghost", className: "justify-start" })}>
          <Inbox className="size-4" />
          Inbox
        </Link>
        <Link href="/meetings" className={buttonVariants({ variant: "ghost", className: "justify-start" })}>
          <CalendarDays className="size-4" />
          Meetings
        </Link>
        <Link href="/partners" className={buttonVariants({ variant: "ghost", className: "justify-start" })}>
          <Handshake className="size-4" />
          Partners
        </Link>
        <Link href="/settings" className={buttonVariants({ variant: "ghost", className: "justify-start" })}>
          <Settings2 className="size-4" />
          Settings
        </Link>
      </nav>
      <div className="border-t px-4 py-4">
        <p className="text-sm font-medium">{userName}</p>
        <p className="text-xs text-muted-foreground">{userEmail}</p>
        <form action={signOutAction} className="mt-3">
          <Button type="submit" variant="outline" size="sm" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}

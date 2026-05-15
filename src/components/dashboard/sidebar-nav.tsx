"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Inbox,
  Landmark,
  Mic,
  PieChart,
  Settings2,
  Trophy,
  Users,
} from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const primaryNav = [
  { href: "/companies", label: "Companies", icon: Users },
  { href: "/deals", label: "Competitions", icon: Trophy },
  { href: "/investors", label: "Investors", icon: Landmark },
  { href: "/runway", label: "Capital", icon: PieChart },
] as const;

const workNav = [
  { href: "/inbox", label: "Follow-ups", icon: Inbox },
  { href: "/meetings", label: "Meetings", icon: CalendarDays },
  { href: "/wispr", label: "Voice notes", icon: Mic },
  { href: "/settings", label: "Settings", icon: Settings2 },
] as const;

function NavLinks({
  entries,
}: {
  entries: readonly { href: string; label: string; icon: typeof Users }[];
}) {
  const pathname = usePathname();

  return (
    <>
      {entries.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href ||
          (href !== "/" && pathname.startsWith(`${href}/`));

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                : "text-sidebar-foreground/85 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="size-4 shrink-0 opacity-95" aria-hidden />
            {label}
          </Link>
        );
      })}
    </>
  );
}

export function DashboardSidebarNav() {
  return (
    <nav className="flex flex-1 flex-col gap-1 px-4 py-4">
      <NavLinks entries={primaryNav} />
      <Separator className="my-3 bg-sidebar-border" />
      <NavLinks entries={workNav} />
    </nav>
  );
}

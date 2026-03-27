"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Brain,
  Calendar,
  CalendarClock,
  LogOut,
  Settings2,
  User2,
} from "lucide-react";

type AppRole = "user" | "doctor" | "admin";

type SidebarItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const ROLE_ITEMS: Record<AppRole, SidebarItem[]> = {
  user: [
    { href: "/dashboard", label: "My assessments", icon: CalendarClock },
    { href: "/dashboard/appointments", label: "My appointments", icon: BadgeCheck },
    { href: "/dashboard/profile", label: "Profile", icon: User2 },
    { href: "/dashboard/settings", label: "Settings", icon: Settings2 },
  ],
  doctor: [
    { href: "/doctor", label: "Schedule", icon: Calendar },
    { href: "/doctor/profile", label: "Profile", icon: User2 },
    { href: "/doctor/settings", label: "Settings", icon: Settings2 },
  ],
  admin: [
    { href: "/admin", label: "Overview", icon: Settings2 },
  ],
};

const ROLE_HOME: Record<AppRole, string> = {
  user: "/dashboard",
  doctor: "/doctor",
  admin: "/admin",
};

const ROLE_SUBTITLE: Record<AppRole, string> = {
  user: "AI Health Dashboard",
  doctor: "Doctor workspace",
  admin: "Admin console",
};

type RoleSidebarProps = {
  role: AppRole;
  onLogout: () => void;
};

export function RoleSidebar({ role, onLogout }: RoleSidebarProps) {
  const pathname = usePathname();
  const items = ROLE_ITEMS[role];

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/80 md:flex">
      <Link href={ROLE_HOME[role]} className="flex items-center gap-3 px-6 py-6">
        <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Brain className="h-5 w-5" />
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-semibold leading-none">HealthGuide</p>
          <p className="text-xs text-muted-foreground">{ROLE_SUBTITLE[role]}</p>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-1 px-3 pb-4 text-sm">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== ROLE_HOME[role] && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                isActive
                  ? "border-l-4 border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onLogout}
          className="mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </button>
      </nav>
    </aside>
  );
}

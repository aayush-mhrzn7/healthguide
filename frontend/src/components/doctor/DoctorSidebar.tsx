"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Calendar, HeartPulse, LogOut, Settings2, User2 } from "lucide-react";

export type DoctorSidebarProps = {
  onLogout: () => void;
};

export function DoctorSidebar({ onLogout }: DoctorSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/80 md:flex">
      <Link href="/doctor" className="flex items-center gap-3 px-6 py-6">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <HeartPulse className="h-5 w-5" />
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-semibold leading-none">HealthGuide</p>
          <p className="text-xs text-muted-foreground">Doctor workspace</p>
        </div>
      </Link>
      <nav className="flex flex-1 flex-col gap-1 px-3 pb-4 text-sm">
        <Link
          href="/doctor"
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
            pathname === "/doctor"
              ? "border-l-4 border-primary bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Schedule</span>
        </Link>
        <Link
          href="/doctor/profile"
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
            pathname === "/doctor/profile"
              ? "border-l-4 border-primary bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <User2 className="h-4 w-4" />
          <span>Profile</span>
        </Link>
        <Link
          href="/doctor/settings"
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
            pathname === "/doctor/settings"
              ? "border-l-4 border-primary bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Settings2 className="h-4 w-4" />
          <span>Settings</span>
        </Link>
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

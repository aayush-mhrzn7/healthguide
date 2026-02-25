"use client";

import Link from "next/link";

import {
  BadgeCheck,
  Bell,
  CalendarClock,
  HeartPulse,
  Moon,
  Settings2,
  ShieldCheck,
  SunMedium,
  User2,
} from "lucide-react";

import { useTheme } from "next-themes";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full flex-1 overflow-hidden">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/80 md:flex">
        <Link href="/" className="flex items-center gap-3 px-6 py-6">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold leading-none">HealthGuide</p>
            <p className="text-xs text-muted-foreground">AI Health Dashboard</p>
          </div>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 px-3 pb-4 text-sm">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <CalendarClock className="h-4 w-4" />
            <span>My assessments</span>
          </Link>
          <Link
            href="/dashboard/appointments"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <BadgeCheck className="h-4 w-4" />
            <span>My appointments</span>
          </Link>
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <User2 className="h-4 w-4" />
            <span>Profile</span>
          </Link>
          <div className="flex items-center gap-3 rounded-lg border-l-4 border-primary bg-primary/10 px-3 py-2.5 text-primary">
            <Settings2 className="h-4 w-4" />
            <span>Settings</span>
          </div>
        </nav>
      </aside>

      <main className="flex min-h-full flex-1 flex-col overflow-y-auto">
        <header className="px-6 pb-4 pt-8 lg:px-8">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Settings
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Control how HealthGuide works for you.
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-lg px-4 py-2 text-sm font-semibold"
            >
              Restore defaults
            </Button>
          </div>
        </header>

        <section className="flex flex-1 gap-0 px-6 pb-8 lg:px-8">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <Card className="border-border/80 bg-card/90 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Notifications
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose when you hear from HealthGuide.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center justify-between gap-4 rounded-lg bg-background/80 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        Assessment summaries
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Updates after each new health assessment.
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg bg-background/80 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        Appointment reminders
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Alerts before upcoming visits.
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/90 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Appearance
                </CardTitle>
                <CardDescription className="text-xs">
                  Light or dark based on your preference.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center justify-between gap-4 rounded-lg bg-background/80 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <SunMedium className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        Use dark mode
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Toggle between light and dark appearance.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isDark}
                    onCheckedChange={(checked) =>
                      setTheme(checked ? "dark" : "light")
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/90 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Privacy and data
                </CardTitle>
                <CardDescription className="text-xs">
                  Control how your data is stored and shared.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center justify-between gap-4 rounded-lg bg-background/80 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        Share with providers
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Allow connected doctors to see your assessment history.
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}

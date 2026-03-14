"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  BadgeCheck,
  CalendarClock,
  HeartPulse,
  MapPin,
  Settings2,
  LogOut,
  Star,
  User2,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/apiClient";
import { format } from "date-fns";

type Appointment = {
  id: number;
  doctorId: number;
  doctorName: string;
  doctorEmail?: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

export default function AppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await api.get<{ appointments: Appointment[] }>(
          "/appointments/user"
        );
        if (isMounted) setAppointments(res.data.appointments);
      } catch {
        if (isMounted) setAppointments([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const now = new Date();
  const upcoming = appointments.filter(
    (a) => new Date(a.startsAt) >= now && a.status === "scheduled"
  );
  const past = appointments.filter(
    (a) => new Date(a.startsAt) < now || a.status !== "scheduled"
  );

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:8000/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore network errors on logout
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("accessToken");
      window.localStorage.removeItem("user");
    }

    router.push("/login");
  };

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
          <div className="flex items-center gap-3 rounded-lg border-l-4 border-primary bg-primary/10 px-3 py-2.5 text-primary">
            <BadgeCheck className="h-4 w-4" />
            <span>My appointments</span>
          </div>
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <User2 className="h-4 w-4" />
            <span>Profile</span>
          </Link>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Settings2 className="h-4 w-4" />
            <span>Settings</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </button>
        </nav>
      </aside>

      <main className="flex min-h-full flex-1 flex-col overflow-y-auto">
        <header className="px-6 pb-4 pt-8 lg:px-8">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                My appointments
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Manage your upcoming visits and review past appointments.
              </p>
            </div>
            <Button
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
              asChild
            >
              <Link href="/dashboard/booking">
                <span className="text-xs font-medium">+</span>
                Schedule new appointment
              </Link>
            </Button>
          </div>
        </header>

        <section className="flex flex-1 gap-0 px-6 pb-8 lg:px-8">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <Card className="border-border/80 bg-card/90 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Upcoming appointments
                </CardTitle>
                <CardDescription className="text-xs">
                  Join virtual visits or get directions to in-person care.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {isLoading ? (
                  <div className="py-4 text-center text-muted-foreground">
                    Loading…
                  </div>
                ) : upcoming.length === 0 ? (
                  <div className="py-4 text-center text-muted-foreground">
                    No upcoming appointments.{" "}
                    <Link
                      href="/dashboard/assessment"
                      className="font-medium text-primary hover:underline"
                    >
                      Start an assessment
                    </Link>{" "}
                    or{" "}
                    <Link
                      href="/dashboard/booking"
                      className="font-medium text-primary hover:underline"
                    >
                      book directly
                    </Link>
                    .
                  </div>
                ) : (
                  upcoming.map((appt) => (
                    <div
                      key={appt.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/60 px-3 py-3"
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-foreground">
                          {appt.doctorName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(appt.startsAt), "MMM d, yyyy")} ·{" "}
                          {format(new Date(appt.startsAt), "h:mm a")}
                        </p>
                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          HealthGuide Virtual
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {appt.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/90 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Past appointments
                </CardTitle>
                <CardDescription className="text-xs">
                  A quick record of your recent visits.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Doctor</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {past.map((appt) => (
                      <tr
                        key={appt.id}
                        className="transition-colors hover:bg-muted/40"
                      >
                        <td className="px-4 py-3 text-muted-foreground">
                          {format(new Date(appt.startsAt), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold text-foreground">
                            {appt.doctorName}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            {appt.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="inline-flex items-center gap-1 px-2 text-[11px] font-semibold text-primary"
                          >
                            View summary
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, HeartPulse, LogOut, Settings2, User2 } from "lucide-react";
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  type Event,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";

import { RoleGuard } from "@/components/auth/RoleGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/apiClient";

import "react-big-calendar/lib/css/react-big-calendar.css";

type DoctorAppointment = {
  id: number;
  startsAt: string;
  endsAt: string;
  status: string;
  patientName: string;
};

type CalendarEvent = Event & {
  id: number;
  resource: DoctorAppointment;
};

const locales = {
  "en-US": undefined,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

function DoctorDashboardInner() {
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadAppointments = async () => {
      try {
        const response = await api.get<{ appointments: DoctorAppointment[] }>(
          "/appointments/doctor",
        );
        if (!isMounted) return;
        setAppointments(response.data.appointments);
      } catch {
        if (!isMounted) return;
        setAppointments([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAppointments();

    return () => {
      isMounted = false;
    };
  }, []);

  const events: CalendarEvent[] = useMemo(
    () =>
      appointments.map((appt) => ({
        id: appt.id,
        title: appt.patientName,
        start: new Date(appt.startsAt),
        end: new Date(appt.endsAt),
        resource: appt,
      })),
    [appointments],
  );

  const upcomingCount = appointments.filter(
    (appt) => new Date(appt.startsAt) >= new Date(),
  ).length;

  const todayCount = appointments.filter((appt) => {
    const start = new Date(appt.startsAt);
    const now = new Date();
    return (
      start.getFullYear() === now.getFullYear() &&
      start.getMonth() === now.getMonth() &&
      start.getDate() === now.getDate()
    );
  }).length;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full flex-1 overflow-hidden">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/80 md:flex">
        <Link href="/" className="flex items-center gap-3 px-6 py-6">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold leading-none">HealthGuide</p>
            <p className="text-xs text-muted-foreground">Doctor workspace</p>
          </div>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 px-3 pb-4 text-sm">
          <div className="flex items-center gap-3 rounded-lg border-l-4 border-primary bg-primary/10 px-3 py-2.5 text-primary">
            <Calendar className="h-4 w-4" />
            <span>Schedule</span>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <User2 className="h-4 w-4" />
            <span>Patient view</span>
          </Link>
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Settings2 className="h-4 w-4" />
            <span>Admin (if applicable)</span>
          </Link>
        </nav>
      </aside>

      <main className="flex min-h-full flex-1 flex-col overflow-y-auto">
        <header className="px-6 pb-4 pt-8 lg:px-8">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                My schedule
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                View all of your upcoming appointments at a glance.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold"
              asChild
            >
              <a
                href="mailto:admin@gmail.com"
                className="inline-flex items-center gap-2"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Contact admin
              </a>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/80 bg-card/90 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground">
                  Today&apos;s visits
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-2xl font-semibold">{todayCount}</p>
              </CardContent>
            </Card>
            <Card className="border-border/80 bg-card/90 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground">
                  Upcoming appointments
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-2xl font-semibold">{upcomingCount}</p>
              </CardContent>
            </Card>
            <Card className="border-border/80 bg-card/90 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground">
                  Total in calendar
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-2xl font-semibold">{appointments.length}</p>
              </CardContent>
            </Card>
          </div>
        </header>

        <section className="flex flex-1 gap-0 px-6 pb-8 lg:px-8">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <Card className="border-border/80 bg-card/90 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Calendar
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="h-[600px] rounded-lg border border-border/60 bg-background/60 p-3 text-xs">
                  {isLoading ? (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      Loading appointments…
                    </div>
                  ) : (
                    <BigCalendar
                      localizer={localizer}
                      events={events}
                      startAccessor="start"
                      endAccessor="end"
                      style={{ height: "100%" }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function DoctorDashboardPage() {
  return (
    <RoleGuard allowed="doctor" fallbackPath="/dashboard">
      <DoctorDashboardInner />
    </RoleGuard>
  );
}


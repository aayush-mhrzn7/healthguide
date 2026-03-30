"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis } from "recharts";
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  type Event,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";

import { RoleSidebar } from "@/components/layout/RoleSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/apiClient";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar.css";

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
  const router = useRouter();
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<"month" | "week" | "day" | "agenda">("week");
  const [date, setDate] = useState(new Date());

  const onView = useCallback((newView: "month" | "week" | "day" | "agenda") => {
    setView(newView);
  }, []);

  const onNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  const handleLogout = async () => {
    try {
      const _apiBase = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ?? "http://localhost:8000";
      await fetch(`${_apiBase}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
    }
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("accessToken");
      window.localStorage.removeItem("user");
    }
    router.push("/login");
  };

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

  const statusData = Object.entries(
    appointments.reduce<Record<string, number>>((acc, appt) => {
      const key = appt.status || "unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([label, value]) => ({ label, value }));

  const weekdayOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const byWeekday = weekdayOrder.map((day) => ({ label: day, value: 0 }));
  for (const appt of appointments) {
    const idx = new Date(appt.startsAt).getDay();
    byWeekday[idx].value += 1;
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full flex-1 overflow-hidden">
      <RoleSidebar role="doctor" onLogout={handleLogout} />

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
            <div className="grid gap-4 md:grid-cols-2">
              <DoctorBarChart title="Appointments by weekday" data={byWeekday} />
              <DoctorPieChart title="Appointment status" data={statusData} />
            </div>
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
                      view={view}
                      onView={onView}
                      date={date}
                      onNavigate={onNavigate}
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
  return <DoctorDashboardInner />;
}

function DoctorBarChart({
  title,
  data,
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
}) {
  const config = {
    value: { label: "Appointments", color: "var(--primary)" },
  } satisfies ChartConfig;

  return (
    <Card className="border-border/80 bg-card/90 shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-44 w-full">
          <BarChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" fill="var(--chart-2)" radius={6} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function DoctorPieChart({
  title,
  data,
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
}) {
  const config = {
    value: { label: "Count", color: "var(--chart-2)" },
  } satisfies ChartConfig;
  const pieData = data.map((d, i) => ({
    ...d,
    fill: `var(--chart-${(i % 5) + 1})`,
  }));

  return (
    <Card className="border-border/80 bg-card/90 shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-44 w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie data={pieData} dataKey="value" nameKey="label" innerRadius={40} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}


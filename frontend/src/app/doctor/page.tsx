"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Mail, Phone, Settings2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  type Event,
  type View,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";

import { RoleSidebar } from "@/components/layout/RoleSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/apiClient";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar.css";

type DoctorAppointment = {
  id: number;
  startsAt: string;
  endsAt: string;
  status: string;
  patientName: string;
  patientEmail: string | null;
  patientPhone: string | null;
  patientProfileImageUrl: string | null;
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
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState<number | null>(null);

  const onView = useCallback((newView: View) => {
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

  const loadAppointments = useCallback(async () => {
    try {
      const response = await api.get<{ appointments: DoctorAppointment[] }>(
        "/appointments/doctor",
      );
      setAppointments(response.data.appointments);
    } catch {
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const updateAppointmentStatus = async (
    appointmentId: number,
    status: "accepted" | "denied",
  ) => {
    try {
      setUpdatingAppointmentId(appointmentId);
      await api.patch(`/appointments/doctor/${appointmentId}/status`, { status });
      await loadAppointments();
      toast.success(status === "accepted" ? "Appointment accepted" : "Appointment denied", {
        description: "The patient has been notified by email.",
      });
    } catch {
      toast.error("Could not update appointment", {
        description: "Please try again in a moment.",
      });
    } finally {
      setUpdatingAppointmentId(null);
    }
  };

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
    (appt) => new Date(appt.startsAt) >= new Date() && appt.status !== "denied",
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
              <DoctorLineChart title="Appointments by weekday" data={byWeekday} color="var(--chart-2)" />
              <DoctorLineChart title="Appointment status" data={statusData} color="var(--chart-1)" />
            </div>
            <Card className="border-border/80 bg-card/90 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Appointment requests
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {isLoading ? (
                  <div className="py-4 text-center text-muted-foreground">
                    Loading requests...
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="py-4 text-center text-muted-foreground">
                    No appointment requests yet.
                  </div>
                ) : (
                  appointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="flex flex-col justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-4 py-3 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">
                            {appt.patientName}
                          </p>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {appt.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(appt.startsAt), "MMM d, yyyy")} at{" "}
                          {format(new Date(appt.startsAt), "h:mm a")}
                        </p>
                        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                          {appt.patientEmail && (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {appt.patientEmail}
                            </span>
                          )}
                          {appt.patientPhone && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {appt.patientPhone}
                            </span>
                          )}
                        </div>
                      </div>
                      {appt.status === "pending" && (
                        <div className="flex shrink-0 gap-2">
                          <Button
                            size="sm"
                            className="h-8 gap-1 rounded-lg px-3 text-xs"
                            disabled={updatingAppointmentId === appt.id}
                            onClick={() => updateAppointmentStatus(appt.id, "accepted")}
                          >
                            {updatingAppointmentId === appt.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 rounded-lg px-3 text-xs"
                            disabled={updatingAppointmentId === appt.id}
                            onClick={() => updateAppointmentStatus(appt.id, "denied")}
                          >
                            <X className="h-3.5 w-3.5" />
                            Deny
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
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

function DoctorLineChart({
  title,
  data,
  color = "var(--chart-2)",
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  color?: string;
}) {
  const config = {
    value: { label: "Count", color },
  } satisfies ChartConfig;

  const id = `gradient-doctor-${title.replace(/\s/g, "")}`;

  return (
    <Card className="border-border/80 bg-card/90 shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-44 w-full">
          <AreaChart data={data} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="10%" stopColor={color} stopOpacity={0.18} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "11px",
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${id})`}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

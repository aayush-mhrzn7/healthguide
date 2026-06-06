"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  MapPin,
  Mail,
  Phone,
  Stethoscope,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/apiClient";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleSidebar } from "@/components/layout/RoleSidebar";
import { formatSpecialty } from "@/lib/specialties";
import { LocationMap } from "@/components/location/LocationMap";

type Appointment = {
  id: number;
  doctorId: number;
  doctorName: string;
  doctorEmail?: string;
  doctorPhone?: string | null;
  doctorSpecialty?: string | null;
  doctorClinicLocation?: string | null;
  doctorLatitude?: number | null;
  doctorLongitude?: number | null;
  doctorProfileImageUrl?: string | null;
  doctorBio?: string | null;
  summary?: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
};

export default function AppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [summaryAppointment, setSummaryAppointment] =
    useState<Appointment | null>(null);

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
    (a) => new Date(a.startsAt) >= now && ["pending", "accepted", "scheduled"].includes(a.status)
  );
  const past = appointments.filter(
    (a) => new Date(a.startsAt) < now || !["pending", "accepted", "scheduled"].includes(a.status)
  );

  const handleLogout = async () => {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ??
      "http://localhost:8000";
    try {
      await fetch(`${apiBase}/api/auth/logout`, {
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

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full flex-1 overflow-hidden">
      <RoleSidebar role="user" onLogout={handleLogout} />

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
                <Suspense fallback={<UpcomingAppointmentsSkeleton />}>
                  {isLoading ? (
                    <UpcomingAppointmentsSkeleton />
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
                        <div className="flex min-w-0 gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold">
                            {appt.doctorProfileImageUrl ? (
                              <img
                                src={appt.doctorProfileImageUrl}
                                alt={appt.doctorName}
                                className="size-full object-cover"
                              />
                            ) : (
                              appt.doctorName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-foreground">
                              {appt.doctorName}
                            </p>
                          <p className="text-[11px] text-muted-foreground">
                            {format(new Date(appt.startsAt), "MMM d, yyyy")} ·{" "}
                            {format(new Date(appt.startsAt), "h:mm a")}
                          </p>
                          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Stethoscope className="h-3 w-3" />
                            {formatSpecialty(appt.doctorSpecialty)}
                          </p>
                          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {appt.doctorClinicLocation ?? "HealthGuide Virtual"}
                          </p>
                          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                            {appt.doctorEmail && (
                              <span className="inline-flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {appt.doctorEmail}
                              </span>
                            )}
                            {appt.doctorPhone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {appt.doctorPhone}
                              </span>
                            )}
                          </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            {appt.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </Suspense>
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
                <Suspense fallback={<PastAppointmentsSkeleton />}>
                {isLoading ? (
                  <PastAppointmentsSkeleton />
                ) : past.length === 0 ? (
                  <div className="py-4 text-center text-muted-foreground">
                    No appointments.
                  </div>
                ) : (
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
                              onClick={() => setSummaryAppointment(appt)}
                            >
                              View summary
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                </Suspense>
              </CardContent>
            </Card>
          </div>
        </section>

        <Dialog
          open={summaryAppointment !== null}
          onOpenChange={(open) => {
            if (!open) setSummaryAppointment(null);
          }}
        >
          <DialogContent className="max-w-lg">
            {summaryAppointment && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-base">
                    Visit summary
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    {summaryAppointment.doctorName} ·{" "}
                    {format(
                      new Date(summaryAppointment.startsAt),
                      "MMM d, yyyy",
                    )}{" "}
                    at{" "}
                    {format(new Date(summaryAppointment.startsAt), "h:mm a")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      About your doctor
                    </p>
                    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                      <p className="font-semibold text-foreground">
                        {summaryAppointment.doctorName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatSpecialty(summaryAppointment.doctorSpecialty)}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {summaryAppointment.doctorClinicLocation ??
                          "HealthGuide Virtual"}
                      </p>
                      <LocationMap
                        key={summaryAppointment.id}
                        latitude={summaryAppointment.doctorLatitude}
                        longitude={summaryAppointment.doctorLongitude}
                        address={summaryAppointment.doctorClinicLocation}
                        className="mt-2"
                      />
                      <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-foreground/90">
                        {summaryAppointment.doctorBio?.trim() ||
                          "No description available for this doctor."}
                      </p>
                    </div>
                  </div>
                  {/* <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Appointment summary
                    </p>
                    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                      <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground/90">
                        {summaryAppointment.summary?.trim() ||
                          "No summary was recorded for this visit."}
                      </p>
                    </div>
                  </div> */}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

function UpcomingAppointmentsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-border/60 bg-background/60 px-3 py-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-44" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PastAppointmentsSkeleton() {
  return (
    <div className="space-y-2 p-2">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: 3 }).map((_, idx) => (
        <Skeleton key={idx} className="h-10 w-full" />
      ))}
    </div>
  );
}

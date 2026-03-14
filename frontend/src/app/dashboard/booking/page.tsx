"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import {
  BadgeCheck,
  CalendarClock,
  HeartPulse,
  User2,
  Settings2,
  LogOut,
} from "lucide-react";

import { api } from "@/lib/apiClient";
import { DoctorSelector, type Doctor } from "@/components/booking/DoctorSelector";
import {
  TimeSlotPicker,
  type BookedSlot,
} from "@/components/booking/TimeSlotPicker";
import { Button } from "@/components/ui/button";

export default function BookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const specialty = searchParams.get("specialty") ?? "general";

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadDoctors = useCallback(async () => {
    setIsLoadingDoctors(true);
    try {
      const res = await api.get<{ doctors: Doctor[] }>(
        `/doctors?specialty=${encodeURIComponent(specialty)}`
      );
      setDoctors(res.data.doctors);
      if (res.data.doctors.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(res.data.doctors[0].id);
      }
    } catch {
      setDoctors([]);
    } finally {
      setIsLoadingDoctors(false);
    }
  }, [specialty]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  useEffect(() => {
    if (!selectedDoctorId) {
      setBookedSlots([]);
      return;
    }
    let isMounted = true;
    const load = async () => {
      try {
        const res = await api.get<{ slots: BookedSlot[] }>(
          `/appointments/booked-slots?doctorId=${selectedDoctorId}`
        );
        if (isMounted) setBookedSlots(res.data.slots);
      } catch {
        if (isMounted) setBookedSlots([]);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [selectedDoctorId]);

  const handleSubmit = async () => {
    if (!selectedDoctorId || !selectedSlot) {
      setError("Please select a doctor and a time slot.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const startsAt = selectedSlot;
    const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);

    try {
      await api.post("/appointments", {
        doctorId: selectedDoctorId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
      });
      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard/appointments");
      }, 2000);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data
          ?.error ?? "Failed to book appointment.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:8000/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("accessToken");
      window.localStorage.removeItem("user");
    }
    router.push("/login");
  };

  if (success) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] w-full flex-1 items-center justify-center">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
            Appointment booked successfully!
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Redirecting to your appointments…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full flex-1 overflow-hidden">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/80 md:flex">
        <Link href="/dashboard" className="flex items-center gap-3 px-6 py-6">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold leading-none">HealthGuide</p>
            <p className="text-xs text-muted-foreground">Book appointment</p>
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
            href="/dashboard/assessment"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <BadgeCheck className="h-4 w-4" />
            <span>New assessment</span>
          </Link>
          <div className="flex items-center gap-3 rounded-lg border-l-4 border-primary bg-primary/10 px-3 py-2.5 text-primary">
            <BadgeCheck className="h-4 w-4" />
            <span>Book appointment</span>
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
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Book an appointment
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Select a doctor and time slot. Recommended specialty:{" "}
            <span className="font-medium text-foreground">{specialty}</span>
          </p>
        </header>

        <section className="flex flex-1 flex-col gap-6 px-6 pb-8 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2">
            <DoctorSelector
              doctors={doctors}
              selectedDoctorId={selectedDoctorId}
              onSelect={setSelectedDoctorId}
              isLoading={isLoadingDoctors}
            />
            <TimeSlotPicker
              selectedSlot={selectedSlot}
              onSelect={setSelectedSlot}
              disabled={isSubmitting}
              bookedSlots={bookedSlots}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={
                !selectedDoctorId ||
                !selectedSlot ||
                isSubmitting ||
                doctors.length === 0
              }
            >
              {isSubmitting ? "Booking…" : "Confirm booking"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Cancel</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}

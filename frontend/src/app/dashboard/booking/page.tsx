"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import { api } from "@/lib/apiClient";
import { DoctorSelector, type Doctor } from "@/components/booking/DoctorSelector";
import {
  TimeSlotPicker,
  type BookedSlot,
} from "@/components/booking/TimeSlotPicker";
import { Button } from "@/components/ui/button";
import { RoleSidebar } from "@/components/layout/RoleSidebar";

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
  const [hasUserLocation, setHasUserLocation] = useState<boolean>(false);

  const loadDoctors = useCallback(async () => {
    setIsLoadingDoctors(true);
    try {
      try {
        const me = await api.get<{ user: { latitude: number | null; longitude: number | null } }>(
          "/auth/me",
        );
        setHasUserLocation(
          typeof me.data.user.latitude === "number" &&
            typeof me.data.user.longitude === "number",
        );
      } catch {
        setHasUserLocation(false);
      }
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
  }, [specialty, selectedDoctorId]);

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
      const message = "Please select a doctor and a time slot.";
      setError(message);
      toast.error("Booking failed", { description: message });
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
      toast.success("Appointment booked", {
        description: "Your appointment is confirmed.",
      });
      router.push("/dashboard/appointments");
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data
          ?.error ?? "Failed to book appointment.";
      setError(msg);
      toast.error("Booking failed", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full flex-1 overflow-hidden">
      <RoleSidebar role="user" onLogout={handleLogout} />

      <main className="flex min-h-full flex-1 flex-col overflow-y-auto">
        <header className="px-6 pb-4 pt-8 lg:px-8">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Book an appointment
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Select a doctor and time slot. Recommended specialty:{" "}
            <span className="font-medium text-foreground">{specialty}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasUserLocation
              ? "Doctors are sorted nearest first using your saved location."
              : "Add your location in profile to sort doctors by nearest distance."}
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

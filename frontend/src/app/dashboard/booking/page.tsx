"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const specialty = searchParams.get("specialty") ?? "general";

  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const response = await api.get<{
        user: { latitude: number | null; longitude: number | null };
      }>("/auth/me");
      return response.data.user;
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });

  const doctorsQuery = useQuery({
    queryKey: ["doctors", "specialty", specialty],
    queryFn: async () => {
      const response = await api.get<{ doctors: Doctor[] }>(
        `/doctors?specialty=${encodeURIComponent(specialty)}`,
      );
      return response.data.doctors;
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });

  const bookedSlotsQuery = useQuery({
    queryKey: ["appointments", "booked-slots", selectedDoctorId],
    queryFn: async () => {
      if (!selectedDoctorId) return [];
      const response = await api.get<{ slots: BookedSlot[] }>(
        `/appointments/booked-slots?doctorId=${selectedDoctorId}`,
      );
      return response.data.slots;
    },
    enabled: Boolean(selectedDoctorId),
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (payload: {
      doctorId: number;
      startsAt: string;
      endsAt: string;
    }) => api.post("/appointments", payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["assessments"] }),
      ]);
    },
  });

  const doctors = doctorsQuery.data ?? [];
  const hasUserLocation =
    typeof meQuery.data?.latitude === "number" &&
    typeof meQuery.data?.longitude === "number";
  const bookedSlots = bookedSlotsQuery.data ?? [];
  const isLoadingDoctors = doctorsQuery.isLoading;
  const isSubmitting = createAppointmentMutation.isPending;

  useEffect(() => {
    if (!selectedDoctorId && doctors.length > 0) {
      setSelectedDoctorId(doctors[0].id);
    }
  }, [doctors, selectedDoctorId]);

  const handleSubmit = async () => {
    if (!selectedDoctorId || !selectedSlot) {
      const message = "Please select a doctor and a time slot.";
      setError(message);
      toast.error("Booking failed", { description: message });
      return;
    }

    setError(null);

    const startsAt = selectedSlot;
    const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);

    try {
      await createAppointmentMutation.mutateAsync({
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
    } finally {}
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

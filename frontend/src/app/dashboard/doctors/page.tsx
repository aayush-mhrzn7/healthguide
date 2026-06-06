"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  Mail,
  MapPin,
  Phone,
  Search,
  Stethoscope,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { DoctorLocationMap } from "@/components/location/DoctorLocationMap";
import { RoleSidebar } from "@/components/layout/RoleSidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/apiClient";
import { formatSpecialty } from "@/lib/specialties";
import { cn } from "@/lib/utils";

type NearbyDoctor = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  specialty: string;
  bio: string | null;
  profileImageUrl: string | null;
  clinicLocation: string | null;
  clinicLatitude: number | null;
  clinicLongitude: number | null;
  distanceKm: number | null;
};

const DISTANCE_OPTIONS = [10, 25, 50, 100];

export default function DoctorsNearYouPage() {
  const router = useRouter();
  const [maxDistanceKm, setMaxDistanceKm] = useState(10);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const doctorsQuery = useQuery({
    queryKey: ["doctors", "nearby", maxDistanceKm],
    queryFn: async () => {
      const response = await api.get<{
        doctors: NearbyDoctor[];
        maxDistanceKm: number;
      }>(`/doctors?maxDistanceKm=${encodeURIComponent(String(maxDistanceKm))}`);
      return response.data.doctors;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const doctors = doctorsQuery.data ?? [];
  const filteredDoctors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter((doctor) => {
      return [
        doctor.name,
        doctor.email,
        doctor.phone ?? "",
        doctor.specialty,
        formatSpecialty(doctor.specialty),
        doctor.clinicLocation ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [doctors, search]);

  useEffect(() => {
    if (selectedDoctorId && filteredDoctors.some((d) => d.id === selectedDoctorId)) {
      return;
    }
    setSelectedDoctorId(filteredDoctors[0]?.id ?? null);
  }, [filteredDoctors, selectedDoctorId]);

  const selectedDoctor =
    filteredDoctors.find((doctor) => doctor.id === selectedDoctorId) ??
    filteredDoctors[0] ??
    null;

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}

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
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Doctors near you
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Browse nearby doctors and schedule directly without taking a quiz.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label htmlFor="distance-filter" className="text-muted-foreground">
                Distance
              </label>
              <select
                id="distance-filter"
                value={String(maxDistanceKm)}
                onChange={(event) => setMaxDistanceKm(Number(event.target.value))}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {DISTANCE_OPTIONS.map((distance) => (
                  <option key={distance} value={distance}>
                    Within {distance} km
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <section className="grid flex-1 gap-4 px-6 pb-8 lg:grid-cols-[minmax(320px,40%)_minmax(0,60%)] lg:px-8">
          <Card className="min-h-[640px] border-border/80 bg-card/90 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Nearby doctors</CardTitle>
              <CardDescription className="text-xs">
                {doctorsQuery.isLoading
                  ? "Loading doctors near your saved location."
                  : `${filteredDoctors.length} doctor${filteredDoctors.length === 1 ? "" : "s"} found.`}
              </CardDescription>
              <div className="relative pt-2">
                <Search className="pointer-events-none absolute left-2 top-4 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, specialty, contact"
                  className="h-8 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </CardHeader>
            <CardContent className="max-h-[calc(100vh-15rem)] space-y-2 overflow-y-auto pr-3">
              {doctorsQuery.isLoading ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Loading doctors...
                </div>
              ) : filteredDoctors.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No doctors found in this radius. Try increasing the distance.
                </div>
              ) : (
                filteredDoctors.map((doctor) => (
                  <button
                    key={doctor.id}
                    type="button"
                    onClick={() => setSelectedDoctorId(doctor.id)}
                    className={cn(
                      "flex w-full gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                      selectedDoctor?.id === doctor.id
                        ? "border-primary bg-primary/10"
                        : "border-border/60 bg-background/60 hover:bg-muted/50",
                    )}
                  >
                    <DoctorAvatar doctor={doctor} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {doctor.name}
                        </p>
                        {doctor.distanceKm != null && (
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            {doctor.distanceKm.toFixed(2)} km
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-primary">
                        {formatSpecialty(doctor.specialty)}
                      </p>
                      {doctor.clinicLocation && (
                        <p className="line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                          {doctor.clinicLocation}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="min-h-[640px] border-border/80 bg-card/90 shadow-xs">
            {selectedDoctor ? (
              <>
                <CardHeader className="pb-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <DoctorAvatar doctor={selectedDoctor} size="lg" />
                      <div className="min-w-0 space-y-2">
                        <div>
                          <CardTitle className="text-xl">
                            {selectedDoctor.name}
                          </CardTitle>
                          <CardDescription className="mt-1 flex items-center gap-1 text-xs">
                            <Stethoscope className="h-3.5 w-3.5" />
                            {formatSpecialty(selectedDoctor.specialty)}
                          </CardDescription>
                        </div>
                        {selectedDoctor.distanceKm != null && (
                          <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                            {selectedDoctor.distanceKm.toFixed(2)} km from your saved location
                          </span>
                        )}
                      </div>
                    </div>
                    <Button className="gap-2" asChild>
                      <Link
                        href={`/dashboard/booking?specialty=${encodeURIComponent(selectedDoctor.specialty)}&doctorId=${encodeURIComponent(String(selectedDoctor.id))}`}
                      >
                        <CalendarPlus className="h-4 w-4" />
                        Schedule
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoTile
                        icon={Mail}
                        label="Email"
                        value={selectedDoctor.email}
                      />
                      <InfoTile
                        icon={Phone}
                        label="Contact number"
                        value={selectedDoctor.phone ?? "Not provided"}
                      />
                      <InfoTile
                        icon={MapPin}
                        label="Clinic location"
                        value={selectedDoctor.clinicLocation ?? "Location not provided"}
                        wide
                      />
                    </div>

                    <div className="rounded-lg border border-border/70 bg-background/60 p-4">
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">
                        About this doctor
                      </p>
                      <p className="text-sm leading-6 text-foreground">
                        {selectedDoctor.bio ??
                          "This doctor has not added a profile bio yet."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <DoctorLocationMap
                      latitude={selectedDoctor.clinicLatitude}
                      longitude={selectedDoctor.clinicLongitude}
                      label={selectedDoctor.name}
                    />
                    <p className="text-[11px] leading-5 text-muted-foreground">
                      Use the schedule button to book directly with this doctor.
                      Your appointment request will include the doctor contact details.
                    </p>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex min-h-[640px] items-center justify-center text-sm text-muted-foreground">
                Select a doctor to view details.
              </CardContent>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}

function DoctorAvatar({
  doctor,
  size = "md",
}: {
  doctor: NearbyDoctor;
  size?: "md" | "lg";
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-semibold text-primary",
        size === "lg" ? "size-16 text-lg" : "size-11 text-sm",
      )}
    >
      {doctor.profileImageUrl ? (
        <img
          src={doctor.profileImageUrl}
          alt={doctor.name}
          className="size-full object-cover"
        />
      ) : (
        doctor.name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
  wide = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/70 bg-background/60 p-3",
        wide && "sm:col-span-2",
      )}
    >
      <div className="mb-1 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="break-words text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

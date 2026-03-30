"use client";

import { Stethoscope } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type Doctor = {
  id: number;
  name: string;
  email: string;
  specialty: string;
  clinicLocation: string | null;
  clinicLatitude: number | null;
  clinicLongitude: number | null;
  distanceKm: number | null;
};

export type DoctorSelectorProps = {
  doctors: Doctor[];
  selectedDoctorId: number | null;
  onSelect: (doctorId: number) => void;
  isLoading?: boolean;
};

export function DoctorSelector({
  doctors,
  selectedDoctorId,
  onSelect,
  isLoading = false,
}: DoctorSelectorProps) {
  if (isLoading) {
    return (
      <Card className="border-border/80 bg-card/90 shadow-xs">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Stethoscope className="h-4 w-4" />
            Select a doctor
          </CardTitle>
          <CardDescription className="text-xs">
            Choose a doctor based on your assessment recommendation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-border/60 bg-background/60 px-4 py-3"
            >
              <Skeleton className="mb-2 h-4 w-40" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (doctors.length === 0) {
    return (
      <Card className="border-border/80 bg-card/90 shadow-xs">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            No doctors available
          </CardTitle>
          <CardDescription className="text-xs">
            There are no doctors matching your criteria. Please try a different
            specialty or contact support.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 bg-card/90 shadow-xs">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Stethoscope className="h-4 w-4" />
          Select a doctor
        </CardTitle>
        <CardDescription className="text-xs">
          Choose a doctor based on your assessment recommendation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {doctors.map((doctor) => (
          <button
            key={doctor.id}
            type="button"
            onClick={() => onSelect(doctor.id)}
            className={`flex w-full flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition-colors ${
              selectedDoctorId === doctor.id
                ? "border-primary bg-primary/10"
                : "border-border/60 bg-background/60 hover:bg-muted/50"
            }`}
          >
            <span className="text-sm font-semibold text-foreground">
              {doctor.name}
            </span>
            <span className="text-xs text-primary">{doctor.specialty}</span>
            {doctor.clinicLocation && (
              <span className="text-[11px] text-muted-foreground">
                Doctor&apos;s clinic location: {doctor.clinicLocation}
              </span>
            )}
            {doctor.distanceKm != null && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                ~{doctor.distanceKm.toFixed(2)} km away
              </span>
            )}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

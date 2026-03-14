"use client";

import { Stethoscope } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type Doctor = {
  id: number;
  name: string;
  email: string;
  specialty: string;
};

export type DoctorSelectorProps = {
  doctors: Doctor[];
  selectedDoctorId: number | null;
  onSelect: (doctorId: number) => void;
  isLoading?: boolean;
};

/**
 * Single Responsibility: Renders list of doctors for selection.
 */
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
          <CardTitle className="text-sm font-semibold">
            Select a doctor
          </CardTitle>
          <CardDescription className="text-xs">
            Loading doctors…
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
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
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

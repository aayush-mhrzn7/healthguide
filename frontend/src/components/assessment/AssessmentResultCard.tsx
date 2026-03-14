"use client";

import { Stethoscope } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type AssessmentResultCardProps = {
  predictedDisease: string;
  recommendedSpecialty: string;
  confidence: string;
  onBookDoctor: () => void;
};

/**
 * Single Responsibility: Displays assessment result and CTA to book a doctor.
 */
export function AssessmentResultCard({
  predictedDisease,
  recommendedSpecialty,
  confidence,
  onBookDoctor,
}: AssessmentResultCardProps) {
  const confidenceLabel =
    confidence === "high"
      ? "High confidence"
      : confidence === "medium"
        ? "Medium confidence"
        : "Low confidence";

  return (
    <Card className="border-border/80 bg-card/90 shadow-xs">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Stethoscope className="h-4 w-4" />
          <span className="text-xs font-medium">Assessment result</span>
        </div>
        <CardTitle className="text-xl font-semibold">{predictedDisease}</CardTitle>
        <CardDescription className="text-xs">
          Recommended specialty: {recommendedSpecialty}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
            confidence === "high"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : confidence === "medium"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {confidenceLabel}
        </span>
        <Button
          className="w-full"
          size="lg"
          onClick={onBookDoctor}
        >
          Book a doctor
        </Button>
      </CardContent>
    </Card>
  );
}

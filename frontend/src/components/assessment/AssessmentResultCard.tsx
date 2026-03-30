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
  topPredictions: Array<{ disease: string; confidence: number }>;
  reasoning?: string;
  selectedSymptoms?: string[];
  onBookDoctor: () => void;
};

export function AssessmentResultCard({
  predictedDisease,
  recommendedSpecialty,
  confidence,
  topPredictions,
  reasoning,
  selectedSymptoms,
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
        {topPredictions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Top predictions
            </p>
            <div className="space-y-1 rounded-md border border-border/70 p-2">
              {topPredictions.map((item, idx) => (
                <div
                  key={`${item.disease}-${idx}`}
                  className="flex items-center justify-between text-xs"
                >
                  <span>{item.disease}</span>
                  <span className="text-muted-foreground">
                    {(item.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {reasoning && (
          <div className="rounded-md border border-border/70 bg-muted/30 p-3">
            <p className="text-xs leading-5 text-muted-foreground">{reasoning}</p>
          </div>
        )}
        {selectedSymptoms && selectedSymptoms.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Symptoms considered
            </p>
            <p className="text-xs text-muted-foreground">
              {selectedSymptoms.slice(0, 8).join(", ")}
            </p>
          </div>
        )}
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

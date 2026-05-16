"use client";

import type React from "react";
import { AlertTriangle, ClipboardList, Pill, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";
import { formatSpecialty } from "@/lib/specialties";

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
  llmAdvice?: {
    overview: string;
    medications: string[];
    selfCare: string[];
    warningSigns: string[];
    disclaimer: string;
    source?: string;
  } | null;
  selectedSymptoms?: string[];
  onBookDoctor: () => void;
};

export function AssessmentResultCard({
  predictedDisease,
  recommendedSpecialty,
  confidence,
  topPredictions,
  reasoning,
  llmAdvice,
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
    <div className="grid w-full gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="border-border/80 bg-card/90 shadow-xs xl:col-span-2">
        <CardContent className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Stethoscope className="h-4 w-4" />
              <span className="text-xs font-medium">Assessment result</span>
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                {predictedDisease}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Recommended specialty: {formatSpecialty(recommendedSpecialty)}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span
              className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${
                confidence === "high"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : confidence === "medium"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {confidenceLabel}
            </span>
            <Button size="lg" onClick={onBookDoctor}>
              Book a doctor
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {reasoning && (
          <Card className="border-border/80 bg-card/90 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Why this result</CardTitle>
              <CardDescription className="text-xs">
                How your answers shaped the recommendation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">{reasoning}</p>
            </CardContent>
          </Card>
        )}
        {llmAdvice && (
          <Card className="border-primary/20 bg-primary/5 shadow-xs">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">Doctor-ready guidance</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Plain-language context to help you prepare for care.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">
                {llmAdvice.overview}
              </p>
              <div className="grid gap-3 lg:grid-cols-2">
                <AdviceList
                  icon={Pill}
                  title="Medication discussion"
                  items={llmAdvice.medications}
                />
                <AdviceList
                  icon={ClipboardList}
                  title="Care steps"
                  items={llmAdvice.selfCare}
                />
                <AdviceList
                  icon={AlertTriangle}
                  title="Watch closely"
                  items={llmAdvice.warningSigns}
                />
                <div className="rounded-md border border-border/70 bg-background/70 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    Safety note
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {llmAdvice.disclaimer}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <aside className="space-y-4">
        {topPredictions.length > 0 && (
          <Card className="border-border/80 bg-card/90 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top predictions</CardTitle>
              <CardDescription className="text-xs">
                Other conditions the model weighed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {topPredictions.map((item, idx) => (
                <div
                  key={`${item.disease}-${idx}`}
                  className="rounded-md border border-border/70 bg-background/70 p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-foreground">{item.disease}</span>
                    <span className="text-muted-foreground">
                      {(item.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(4, Math.min(100, item.confidence * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        {selectedSymptoms && selectedSymptoms.length > 0 && (
          <Card className="border-border/80 bg-card/90 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Symptoms considered</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {selectedSymptoms.slice(0, 12).map((symptom) => (
                <span
                  key={symptom}
                  className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground"
                >
                  {symptom}
                </span>
              ))}
            </CardContent>
          </Card>
        )}
        <Card className="border-border/80 bg-card/90 shadow-xs">
          <CardContent className="space-y-3 p-4">
            <p className="text-xs leading-5 text-muted-foreground">
              Ready to review this with a specialist? Continue to booking with the recommended specialty preselected.
            </p>
            <Button className="w-full" size="lg" onClick={onBookDoctor}>
              Book a doctor
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function AdviceList({
  icon: Icon,
  title,
  items,
}: {
  icon: React.ElementType;
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-md border border-border/70 bg-background/70 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {title}
      </div>
      <ul className="space-y-1.5 text-xs leading-5 text-muted-foreground">
        {items.map((item, idx) => (
          <li key={`${title}-${idx}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/apiClient";
import { RoleSidebar } from "@/components/layout/RoleSidebar";
import { AssessmentResultCard } from "@/components/assessment/AssessmentResultCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type AssessmentReport = {
  id: number;
  predictedDisease: string;
  recommendedSpecialty: string;
  confidence: string;
  topPredictions: Array<{ disease: string; confidence: number }>;
  reasoning: string;
  selectedSymptoms: string[];
  createdAt: string;
};

export default function AssessmentReportPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const reportId = useMemo(() => Number(params.id), [params.id]);
  const reportQuery = useQuery({
    queryKey: ["assessments", "detail", reportId],
    queryFn: async () => {
      const response = await api.get<{ assessment: AssessmentReport }>(
        `/assessments/${reportId}`,
      );
      return response.data.assessment;
    },
    enabled: Number.isInteger(reportId) && reportId > 0,
    staleTime: 20 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
  const report = reportQuery.data ?? null;
  const isLoading = reportQuery.isLoading;
  const error = !Number.isInteger(reportId) || reportId <= 0
    ? "Invalid report id."
    : reportQuery.isError
      ? "We could not load this report."
      : null;

  const handleLogout = async () => {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ??
      "http://localhost:4000";
    try {
      await fetch(`${apiBase}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
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
      <main className="flex min-h-full flex-1 flex-col overflow-y-auto px-6 pb-8 pt-8 lg:px-8">
        <Button variant="ghost" className="w-fit" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>

        <section className="mt-4">
          {isLoading ? (
            <Card className="max-w-xl">
              <CardContent className="py-6 text-sm text-muted-foreground">
                Loading report...
              </CardContent>
            </Card>
          ) : error || !report ? (
            <Card className="max-w-xl border-destructive/50">
              <CardContent className="py-6 text-sm text-destructive">
                {error ?? "Report not found."}
              </CardContent>
            </Card>
          ) : (
            <div className="max-w-xl space-y-3">
              <p className="text-xs text-muted-foreground">
                Report created on {new Date(report.createdAt).toLocaleString()}
              </p>
              <AssessmentResultCard
                predictedDisease={report.predictedDisease}
                recommendedSpecialty={report.recommendedSpecialty}
                confidence={report.confidence}
                topPredictions={report.topPredictions ?? []}
                reasoning={report.reasoning}
                selectedSymptoms={report.selectedSymptoms}
                onBookDoctor={() => {
                  router.push(
                    `/dashboard/booking?specialty=${encodeURIComponent(report.recommendedSpecialty ?? "general")}`,
                  );
                }}
              />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

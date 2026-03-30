"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis } from "recharts";

import { Filter, Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  HealthHistoryTable,
  type AssessmentRow,
} from "@/components/dashboard/health-history-table";
import { api } from "@/lib/apiClient";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleSidebar } from "@/components/layout/RoleSidebar";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type AuthUser = {
  name?: string;
};

function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [userName, setUserName] = useState<string>("there");
  const [isLoading, setIsLoading] = useState(true);

  const confidenceData = ["high", "medium", "low"].map((label) => ({
    label,
    value: assessments.filter((a) => a.confidence === label).length,
  }));

  const diseaseData = Object.entries(
    assessments.reduce<Record<string, number>>((acc, row) => {
      acc[row.predictedDisease] = (acc[row.predictedDisease] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored?.name) setUserName(stored.name.split(" ")[0]);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const assessmentsRes = await api.get<{ assessments: AssessmentRow[] }>(
          "/assessments",
        );
        if (isMounted) setAssessments(assessmentsRes.data.assessments);
      } catch {
        if (isMounted) setAssessments([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ?? "http://localhost:8000"}/api/auth/logout`,
        { method: "POST", credentials: "include" },
      );
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
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Welcome back, {userName}
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Your latest AI-powered assessments at a glance.
              </p>
            </div>
            <Button
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
              asChild
            >
              <Link href="/dashboard/assessment">
                <span className="text-xs font-medium">+</span>
                New assessment
              </Link>
            </Button>
          </div>
        </header>

        <section className="flex flex-1 gap-0 px-6 pb-8 lg:px-8">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <UserBarChart title="Top conditions" data={diseaseData} />
              <UserPieChart title="Confidence mix" data={confidenceData} />
            </div>
            <h5 className="font-bold text-xl ">My assessments</h5>
            <CardContent className="p-0">
              <Suspense fallback={<HealthHistorySkeleton />}>
                {isLoading ? (
                  <HealthHistorySkeleton />
                ) : (
                  <HealthHistoryTable
                    data={assessments}
                    totalCount={assessments.length}
                  />
                )}
              </Suspense>
            </CardContent>
          </div>
        </section>
      </main>
    </div>
  );
}

function UserBarChart({
  title,
  data,
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
}) {
  const config = {
    value: { label: "Assessments", color: "var(--primary)" },
  } satisfies ChartConfig;

  return (
    <Card className="border-border/80 bg-card/90 shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-44 w-full">
          <BarChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => String(v).slice(0, 12)}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" fill="var(--chart-1)" radius={6} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function UserPieChart({
  title,
  data,
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
}) {
  const config = {
    value: { label: "Count", color: "var(--chart-1)" },
  } satisfies ChartConfig;
  const pieData = data.map((d, i) => ({
    ...d,
    fill: `var(--chart-${(i % 5) + 1})`,
  }));

  return (
    <Card className="border-border/80 bg-card/90 shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-44 w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie data={pieData} dataKey="value" nameKey="label" innerRadius={40} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function HealthHistorySkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-border/60 bg-background/60 px-3 py-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

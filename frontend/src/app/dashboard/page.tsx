"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

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
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

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
  const [userName, setUserName] = useState<string>("there");
  const assessmentsQuery = useQuery({
    queryKey: ["assessments", "list"],
    queryFn: async () => {
      const response = await api.get<{ assessments: AssessmentRow[] }>("/assessments");
      return response.data.assessments;
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
  const assessments = assessmentsQuery.data ?? [];
  const isLoading = assessmentsQuery.isLoading;

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
              <UserLineChart title="Top conditions" data={diseaseData} color="var(--chart-1)" />
              <UserLineChart title="Confidence mix" data={confidenceData} color="var(--chart-2)" />
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

function UserLineChart({
  title,
  data,
  color = "var(--chart-1)",
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  color?: string;
}) {
  const config = {
    value: { label: "Count", color },
  } satisfies ChartConfig;

  const id = `gradient-user-${title.replace(/\s/g, "")}`;

  return (
    <Card className="border-border/80 bg-card/90 shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-44 w-full">
          <AreaChart data={data} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="10%" stopColor={color} stopOpacity={0.18} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => String(v).slice(0, 10)}
            />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "11px",
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${id})`}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </AreaChart>
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

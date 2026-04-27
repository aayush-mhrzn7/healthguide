"use client";

import { useState } from "react";
import { Activity, Loader2, Plus, UserCog, Users, WandSparkles } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { RoleGuard } from "@/components/auth/RoleGuard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/apiClient";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { RoleSidebar } from "@/components/layout/RoleSidebar";
import { LocationPicker } from "@/components/location/LocationPicker";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type AdminStats = {
  totalUsers: number;
  totalDoctors: number;
  totalAppointments: number;
  totalAssessments: number;
  diseaseDistribution: Array<{ label: string; value: number }>;
  confidenceDistribution: Array<{ label: string; value: number }>;
  appointmentStatusDistribution: Array<{ label: string; value: number }>;
};

type HealthService = {
  status: "healthy" | "degraded";
  latencyMs: number | null;
};

type AdminHealth = {
  backend: HealthService;
  database: HealthService;
  modelApi: HealthService;
  checkedAt: string;
};

function MiniLineChart({
  title,
  data,
  color = "var(--chart-1)",
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  color?: string;
}) {
  const chartConfig = {
    value: { label: "Count", color },
  } satisfies ChartConfig;

  const id = `gradient-admin-${title.replace(/\s/g, "")}`;

  return (
    <Card className="border-border/80 bg-card/90 shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-1">
        {data.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data yet.</p>
        ) : (
          <ChartContainer config={chartConfig} className="h-52 w-full">
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
                interval={0}
                tickMargin={6}
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => String(v).slice(0, 12)}
              />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
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
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  return (
    <RoleGuard allowed="admin" fallbackPath="/dashboard">
      <AdminDashboardInner />
    </RoleGuard>
  );
}

function AdminDashboardInner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const statsQuery = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const response = await api.get<{ stats: AdminStats }>("/admin/stats");
      return response.data.stats;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
  const healthQuery = useQuery({
    queryKey: ["admin", "health"],
    queryFn: async () => {
      const response = await api.get<{ health: AdminHealth }>("/admin/health");
      return response.data.health;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
  const stats = statsQuery.data ?? null;
  const health = healthQuery.data ?? null;
  const isLoadingStats = statsQuery.isLoading || healthQuery.isLoading;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clinicLocation, setClinicLocation] = useState("");
  const [clinicLatitude, setClinicLatitude] = useState<number | null>(null);
  const [clinicLongitude, setClinicLongitude] = useState<number | null>(null);
  const [specialty, setSpecialty] = useState("general");
  const [isCreateDoctorOpen, setIsCreateDoctorOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateTempPassword = () => {
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
    const numbers = "23456789";
    const symbols = "@#$%";
    const all = letters + numbers + symbols;
    const chars = [
      letters[Math.floor(Math.random() * letters.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
    ];
    while (chars.length < 8) {
      chars.push(all[Math.floor(Math.random() * all.length)]);
    }
    for (let i = chars.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    setPassword(chars.join(""));
  };

  const createDoctorMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      email: string;
      password: string;
      clinicLocation: string | null;
      clinicLatitude: number | null;
      clinicLongitude: number | null;
      specialty: string;
    }) => api.post("/admin/doctors", payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "stats"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "health"] }),
      ]);
      setName("");
      setEmail("");
      setPassword("");
      setClinicLocation("");
      setClinicLatitude(null);
      setClinicLongitude(null);
      setSpecialty("general");
      setIsCreateDoctorOpen(false);
      toast.success("Doctor created", {
        description: "Doctor account was created successfully.",
      });
    },
  });
  const isCreating = createDoctorMutation.isPending;

  const handleCreateDoctor = async () => {
    setError(null);
    try {
      await createDoctorMutation.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        clinicLocation: clinicLocation.trim() || null,
        clinicLatitude,
        clinicLongitude,
        specialty,
      });

    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data
          ?.error ?? "Failed to create doctor.";
      setError(msg);
      toast.error("Create doctor failed", { description: msg });
    } finally {}
  };

  const handleLogout = async () => {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ??
      "http://localhost:8000";
    try {
      await fetch(`${apiBase}/api/auth/logout`, {
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
      <RoleSidebar role="admin" onLogout={handleLogout} />

      <main className="flex min-h-full flex-1 flex-col overflow-y-auto">
        <header className="px-6 pb-4 pt-8 lg:px-8">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Admin dashboard
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                View key usage metrics and platform health at a glance.
              </p>
            </div>
            <Dialog open={isCreateDoctorOpen} onOpenChange={setIsCreateDoctorOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1 rounded-lg px-3 text-xs font-semibold">
                  <Plus className="h-3.5 w-3.5" />
                  Create doctor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle className="text-base">Create a new doctor</DialogTitle>
                  <DialogDescription className="text-xs">
                    Add doctor credentials and clinic details.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 text-xs">
                  <div className="grid gap-1">
                    <label
                      htmlFor="doctor-name"
                      className="text-[11px] font-medium text-muted-foreground"
                    >
                      Full name
                    </label>
                    <input
                      id="doctor-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Dr. Jane Doe"
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                  <div className="grid gap-1">
                    <label
                      htmlFor="doctor-email"
                      className="text-[11px] font-medium text-muted-foreground"
                    >
                      Email
                    </label>
                    <input
                      id="doctor-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="doctor@example.com"
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                  <div className="grid gap-1">
                    <label
                      htmlFor="doctor-password"
                      className="text-[11px] font-medium text-muted-foreground"
                    >
                      Temporary password (8+ chars, letters &amp; numbers)
                    </label>
                    <input
                      id="doctor-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="e.g. Doctor123!"
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    <div className="pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 text-[11px]"
                        onClick={generateTempPassword}
                      >
                        <WandSparkles className="h-3.5 w-3.5" />
                        Magic wand: generate 8-char temp password
                      </Button>
                    </div>
                    {password && (
                      <div className="flex flex-wrap gap-3 pt-1">
                        <span
                          className={
                            password.length >= 8
                              ? "text-[11px] text-emerald-600 dark:text-emerald-400"
                              : "text-[11px] text-muted-foreground"
                          }
                        >
                          {password.length >= 8 ? "✓" : "○"} 8+ characters
                        </span>
                        <span
                          className={
                            /(?=.*[A-Za-z])/.test(password)
                              ? "text-[11px] text-emerald-600 dark:text-emerald-400"
                              : "text-[11px] text-muted-foreground"
                          }
                        >
                          {/(?=.*[A-Za-z])/.test(password) ? "✓" : "○"} Letter
                        </span>
                        <span
                          className={
                            /(?=.*\d)/.test(password)
                              ? "text-[11px] text-emerald-600 dark:text-emerald-400"
                              : "text-[11px] text-muted-foreground"
                          }
                        >
                          {/(?=.*\d)/.test(password) ? "✓" : "○"} Number
                        </span>
                        <span
                          className={
                            /(?=.*[^A-Za-z\d])/.test(password)
                              ? "text-[11px] text-emerald-600 dark:text-emerald-400"
                              : "text-[11px] text-muted-foreground"
                          }
                        >
                          {/(?=.*[^A-Za-z\d])/.test(password) ? "✓" : "○"} Symbol
                          (optional)
                        </span>
                      </div>
                    )}
                  </div>
                  <LocationPicker
                    label="Doctor's clinic location"
                    address={clinicLocation}
                    latitude={clinicLatitude}
                    longitude={clinicLongitude}
                    onAddressChange={setClinicLocation}
                    onLocationChange={({ address, latitude, longitude }) => {
                      setClinicLocation(address);
                      setClinicLatitude(latitude);
                      setClinicLongitude(longitude);
                    }}
                    placeholder="Search clinic location"
                  />
                  <div className="grid gap-1">
                    <label
                      htmlFor="doctor-specialty"
                      className="text-[11px] font-medium text-muted-foreground"
                    >
                      Specialty
                    </label>
                    <select
                      id="doctor-specialty"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="general">General</option>
                      <option value="respiratory">Respiratory</option>
                      <option value="allergy">Allergy</option>
                      <option value="cardiology">Cardiology</option>
                    </select>
                  </div>
                  {error && <p className="text-[11px] text-destructive">{error}</p>}
                  <div className="pt-1">
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 gap-1 rounded-lg px-3 text-xs font-semibold"
                      onClick={handleCreateDoctor}
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          Create doctor
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="border-border/80 bg-card/90 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  Total users
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-2xl font-semibold">
                  {isLoadingStats ? (
                    <Skeleton className="h-7 w-10" />
                  ) : (
                    (stats?.totalUsers ?? 0)
                  )}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/80 bg-card/90 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <UserCog className="h-3.5 w-3.5" />
                  Doctors
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-2xl font-semibold">
                  {isLoadingStats ? (
                    <Skeleton className="h-7 w-10" />
                  ) : (
                    (stats?.totalDoctors ?? 0)
                  )}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/80 bg-card/90 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Activity className="h-3.5 w-3.5" />
                  Appointments
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-2xl font-semibold">
                  {isLoadingStats ? (
                    <Skeleton className="h-7 w-10" />
                  ) : (
                    (stats?.totalAppointments ?? 0)
                  )}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/80 bg-card/90 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Activity className="h-3.5 w-3.5" />
                  Assessments
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-2xl font-semibold">
                  {isLoadingStats ? (
                    <Skeleton className="h-7 w-10" />
                  ) : (
                    (stats?.totalAssessments ?? 0)
                  )}
                </p>
              </CardContent>
            </Card>
          </div>
        </header>

        <section className="flex flex-1 gap-0 px-6 pb-8 lg:px-8">
          <div className="grid min-w-0 flex-1 gap-4 md:grid-cols-2">
            <Card className="border-border/80 bg-card/90 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold">System health checks</CardTitle>
                <CardDescription className="text-[11px]">
                  Backend, database, and model API status with response latency.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-1">
                {isLoadingStats ? (
                  <Skeleton className="h-24 w-full" />
                ) : health ? (
                  <>
                    {[
                      { label: "Backend API", service: health.backend },
                      { label: "Database", service: health.database },
                      { label: "Model API", service: health.modelApi },
                    ].map(({ label, service }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between rounded-md border border-border/60 bg-background/60 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              service.status === "healthy"
                                ? "bg-emerald-500"
                                : "bg-destructive"
                            }`}
                          />
                          <span className="text-xs font-medium">{label}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-semibold">
                            {service.status === "healthy" ? "Healthy" : "Degraded"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {service.latencyMs !== null ? `${service.latencyMs} ms` : "No response"}
                          </p>
                        </div>
                      </div>
                    ))}
                    <p className="text-[10px] text-muted-foreground">
                      Checked: {new Date(health.checkedAt).toLocaleTimeString()}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Could not load health checks.</p>
                )}
              </CardContent>
            </Card>
            <MiniLineChart
              title="Top predicted conditions"
              data={stats?.diseaseDistribution ?? []}
              color="var(--chart-1)"
            />
            <MiniLineChart
              title="Assessment confidence"
              data={stats?.confidenceDistribution ?? []}
              color="var(--chart-2)"
            />
            <MiniLineChart
              title="Appointment status"
              data={stats?.appointmentStatusDistribution ?? []}
              color="var(--chart-3)"
            />
          </div>
        </section>
      </main>
    </div>
  );
}

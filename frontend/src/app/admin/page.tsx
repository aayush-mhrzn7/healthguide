"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  HeartPulse,
  LogOut,
  Plus,
  Settings2,
  Users,
  UserCog,
} from "lucide-react";

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

type AdminStats = {
  totalUsers: number;
  totalDoctors: number;
  totalAppointments: number;
};

export default function AdminDashboardPage() {
  return (
    <RoleGuard allowed="admin" fallbackPath="/dashboard">
      <AdminDashboardInner />
    </RoleGuard>
  );
}

function AdminDashboardInner() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      try {
        const response = await api.get<{ stats: AdminStats }>("/admin/stats");
        if (!isMounted) return;
        setStats(response.data.stats);
      } catch {
        if (!isMounted) return;
        setStats(null);
      } finally {
        if (isMounted) {
          setIsLoadingStats(false);
        }
      }
    };

    loadStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateDoctor = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsCreating(true);

    try {
      await api.post("/admin/doctors", {
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
      });

      setSuccessMessage("Doctor account created.");
      setName("");
      setEmail("");
      setPassword("");

      // Refresh stats after creating a doctor
      try {
        const response = await api.get<{ stats: AdminStats }>("/admin/stats");
        setStats(response.data.stats);
      } catch {
        // ignore
      }
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data
          ?.error ?? "Failed to create doctor.";
      setError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full flex-1 overflow-hidden">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/80 md:flex">
        <Link href="/" className="flex items-center gap-3 px-6 py-6">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold leading-none">HealthGuide</p>
            <p className="text-xs text-muted-foreground">Admin console</p>
          </div>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 px-3 pb-4 text-sm">
          <div className="flex items-center gap-3 rounded-lg border-l-4 border-primary bg-primary/10 px-3 py-2.5 text-primary">
            <Settings2 className="h-4 w-4" />
            <span>Overview</span>
          </div>
          <Link
            href="/doctor"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <UserCog className="h-4 w-4" />
            <span>Doctor schedule</span>
          </Link>
        </nav>
      </aside>

      <main className="flex min-h-full flex-1 flex-col overflow-y-auto">
        <header className="px-6 pb-4 pt-8 lg:px-8">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Admin dashboard
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Create doctor accounts and view key usage metrics.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold"
              asChild
            >
              <a
                href="mailto:support@example.com"
                className="inline-flex items-center gap-2"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out of admin
              </a>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/80 bg-card/90 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  Total users
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-2xl font-semibold">
                  {isLoadingStats ? "—" : stats?.totalUsers ?? 0}
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
                  {isLoadingStats ? "—" : stats?.totalDoctors ?? 0}
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
                  {isLoadingStats ? "—" : stats?.totalAppointments ?? 0}
                </p>
              </CardContent>
            </Card>
          </div>
        </header>

        <section className="flex flex-1 gap-0 px-6 pb-8 lg:px-8">
          <div className="flex min-w-0 flex-1 flex-col gap-4 md:max-w-xl">
            <Card className="border-border/80 bg-card/90 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Create a new doctor
                </CardTitle>
                <CardDescription className="text-xs">
                  Generate login credentials for a doctor to access their
                  schedule.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
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
                    Temporary password
                  </label>
                  <input
                    id="doctor-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                {error && (
                  <p className="text-[11px] text-destructive">{error}</p>
                )}
                {successMessage && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    {successMessage}
                  </p>
                )}
                <div className="pt-1">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 gap-1 rounded-lg px-3 text-xs font-semibold"
                    onClick={handleCreateDoctor}
                    disabled={isCreating}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {isCreating ? "Creating…" : "Create doctor"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}


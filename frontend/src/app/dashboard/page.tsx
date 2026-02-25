import Link from "next/link";

import {
  BadgeCheck,
  CalendarClock,
  Filter,
  HeartPulse,
  Search,
  Settings2,
  Star,
  User2,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HealthHistoryTable } from "@/components/dashboard/health-history-table";

const UPCOMING_APPOINTMENTS = [
  {
    id: 1,
    title: "Follow-up with Cardiologist",
    doctor: "Dr. Patel",
    date: "Mar 3, 2026",
    time: "10:30 AM",
    location: "Downtown Heart Clinic",
  },
  {
    id: 2,
    title: "Annual Physical",
    doctor: "Dr. Nguyen",
    date: "Apr 18, 2026",
    time: "2:00 PM",
    location: "HealthGuide Partner Clinic",
  },
];

const LAST_CHECKUP = {
  date: "Jan 6, 2026",
  summary: "General wellness checkup. All vitals within expected ranges.",
  recommendation:
    "Maintain current activity level and schedule next visit in 12 months.",
};

const HEALTH_HISTORY = [
  {
    date: "Mar 20, 2026",
    condition: "Seasonal flu",
    symptoms: "Fever, dry cough",
    confidence: "High (94%)",
    badgeVariant: "success" as const,
  },
  {
    date: "Feb 2, 2026",
    condition: "Migraine",
    symptoms: "Headache, nausea",
    confidence: "Medium (78%)",
    badgeVariant: "warning" as const,
  },
  {
    date: "Dec 18, 2025",
    condition: "Common cold",
    symptoms: "Sneezing, sore throat",
    confidence: "High (91%)",
    badgeVariant: "success" as const,
  },
  {
    date: "Nov 5, 2025",
    condition: "Allergic rhinitis",
    symptoms: "Itchy eyes, coughing",
    confidence: "Low (42%)",
    badgeVariant: "destructive" as const,
  },
] satisfies {
  date: string;
  condition: string;
  symptoms: string;
  confidence: string;
  badgeVariant: "success" | "warning" | "destructive";
}[];

export default function DashboardPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full flex-1 overflow-hidden">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/80 md:flex">
        <Link href="/" className="flex items-center gap-3 px-6 py-6">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold leading-none">HealthGuide</p>
            <p className="text-xs text-muted-foreground">AI Health Dashboard</p>
          </div>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 px-3 pb-4 text-sm">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg border-l-4 border-primary bg-primary/10 px-3 py-2.5 text-primary"
          >
            <CalendarClock className="h-4 w-4" />
            <span>My assessments</span>
          </Link>
          <Link
            href="/dashboard/appointments"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <BadgeCheck className="h-4 w-4" />
            <span>My appointments</span>
          </Link>
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <User2 className="h-4 w-4" />
            <span>Profile</span>
          </Link>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Settings2 className="h-4 w-4" />
            <span>Settings</span>
          </Link>
        </nav>
      </aside>

      <main className="flex min-h-full flex-1 flex-col overflow-y-auto">
        <header className="px-6 pb-4 pt-8 lg:px-8">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Welcome back, Aayush 👋🏽
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Your latest AI-powered assessments and appointments at a glance.
              </p>
            </div>
            <Button className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold">
              <span className="text-xs font-medium">+</span>
              New assessment
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 ">
            <Card className="border-border/80 gap-2 bg-card/90 shadow-xs">
              <CardHeader className="s">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarClock className="h-4 w-4" />
                  <span className="text-xs font-medium">Last checkup</span>
                </div>
              </CardHeader>
              <CardContent className="">
                <p className="text-xl font-semibold">{LAST_CHECKUP.date}</p>
              </CardContent>
            </Card>

            <Card className="border-border/80 gap-2 bg-card/90 shadow-xs">
              <CardHeader className="">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BadgeCheck className="h-4 w-4" />
                  <span className="text-xs font-medium">Next appointment</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">
                  {UPCOMING_APPOINTMENTS[0]?.date}
                </p>
                <p className="text-xs text-muted-foreground">
                  {UPCOMING_APPOINTMENTS[0]?.title}
                </p>
              </CardContent>
            </Card>
          </div>
        </header>

        <section className="flex flex-1 gap-0 px-6 pb-8 lg:px-8">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
              <Card className="border-border/80 bg-card/90 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">
                    Upcoming appointments
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Stay ahead of your scheduled visits.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {UPCOMING_APPOINTMENTS.map((appt) => (
                    <div
                      key={appt.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/60 px-3 py-3 text-xs"
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          {appt.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {appt.doctor} · {appt.location}
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-muted-foreground">
                        <p>{appt.date}</p>
                        <p>{appt.time}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card/90 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">
                    Last checkup
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Based on your most recent full assessment.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {LAST_CHECKUP.date}
                  </p>
                  <p className="text-foreground">{LAST_CHECKUP.summary}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {LAST_CHECKUP.recommendation}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-2 border-border/80 pb-0 bg-card/90 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-sm font-semibold">
                    My health history
                  </CardTitle>
                  <CardDescription className="text-xs">
                    A record of your recent HealthGuide assessments.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground"
                    aria-label="Filter"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground"
                    aria-label="Search"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <HealthHistoryTable data={HEALTH_HISTORY} totalCount={12} />
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}

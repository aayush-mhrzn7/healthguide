import Link from "next/link";

import {
  BadgeCheck,
  CalendarClock,
  HeartPulse,
  Mail,
  MapPin,
  Phone,
  Settings2,
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

export default function ProfilePage() {
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
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
          <div className="flex items-center gap-3 rounded-lg border-l-4 border-primary bg-primary/10 px-3 py-2.5 text-primary">
            <User2 className="h-4 w-4" />
            <span>Profile</span>
          </div>
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
                Profile
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Manage your personal details and health preferences.
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-lg px-4 py-2 text-sm font-semibold"
            >
              Edit profile
            </Button>
          </div>
        </header>

        <section className="flex flex-1 gap-0 px-6 pb-8 lg:px-8">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <Card className="border-border/80 bg-card/90 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Personal information
                </CardTitle>
                <CardDescription className="text-xs">
                  Basic details used for your assessments and appointments.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 text-xs sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">Full name</p>
                  <p className="text-sm font-semibold text-foreground">
                    Aayush Maharjan
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">
                    Date of birth
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    June 10, 2004
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">Gender</p>
                  <p className="text-sm font-semibold text-foreground">Male</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">
                    Blood type
                  </p>
                  <p className="text-sm font-semibold text-foreground">AB+</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/90 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Contact and address
                </CardTitle>
                <CardDescription className="text-xs">
                  Where your doctors and clinics can reach you.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 text-xs sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">Email</p>
                  <p className="flex items-center gap-1 text-sm font-semibold text-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    aayushmaharjan497@gmail.com
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">Phone</p>
                  <p className="flex items-center gap-1 text-sm font-semibold text-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    9823202410
                  </p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-[11px] text-muted-foreground">
                    Home address
                  </p>
                  <p className="flex items-center gap-1 text-sm font-semibold text-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    Shankhamul, Lalitpur
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/90 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Health preferences
                </CardTitle>
                <CardDescription className="text-xs">
                  How HealthGuide personalizes your recommendations.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 text-xs sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">
                    Preferred communication
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    Email and push notifications
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">
                    Primary care preference
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    Virtual visits when available
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}

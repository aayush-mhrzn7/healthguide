"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  BadgeCheck,
  CalendarClock,
  HeartPulse,
  Mail,
  MapPin,
  Phone,
  Settings2,
  LogOut,
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
import { api } from "@/lib/apiClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ProfileUser = {
  id: string;
  name: string;
  email: string;
  dateOfBirth: string | null;
  gender: string | null;
  bloodType: string | null;
  phone: string | null;
  address: string | null;
  preferredCommunication: string | null;
  primaryCarePreference: string | null;
};

export default function ProfilePage() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formDob, setFormDob] = useState("");
  const [formGender, setFormGender] = useState("");
  const [formBloodType, setFormBloodType] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        const response = await api.get<{ user: ProfileUser }>("/auth/me");
        if (!isMounted) return;
        setUser(response.data.user);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to load profile", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const openDialogWithCurrentValues = () => {
    if (!user) return;

    setFormDob(
      user.dateOfBirth
        ? new Date(user.dateOfBirth).toISOString().slice(0, 10)
        : "",
    );
    setFormGender(user.gender ?? "");
    setFormBloodType(user.bloodType ?? "");
    setFormPhone(user.phone ?? "");
    setFormAddress(user.address ?? "");
    setIsDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);

      const payload = {
        dateOfBirth: formDob || null,
        gender: formGender || null,
        bloodType: formBloodType || null,
        phone: formPhone || null,
        address: formAddress || null,
      };

      const response = await api.patch<{ user: ProfileUser }>(
        "/auth/me",
        payload,
      );

      setUser(response.data.user);
      setIsDialogOpen(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to save profile", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore network errors on logout
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("accessToken");
      window.localStorage.removeItem("user");
    }

    router.push("/login");
  };

  const displayOrFallback = (
    value: string | null | undefined,
    fallback = "Not set",
  ) => (value && value.trim().length > 0 ? value : fallback);

  const formattedDob =
    user?.dateOfBirth != null
      ? new Date(user.dateOfBirth).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Not set";

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
          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </button>
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
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-lg px-4 py-2 text-sm font-semibold"
                  onClick={openDialogWithCurrentValues}
                  disabled={isLoading || !user}
                >
                  Edit profile
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Edit profile</DialogTitle>
                  <DialogDescription>
                    Update your basic health details. You can leave any field
                    blank to mark it as not specified.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-1 text-xs">
                    <label
                      htmlFor="dob"
                      className="text-[11px] font-medium text-muted-foreground"
                    >
                      Date of birth
                    </label>
                    <input
                      id="dob"
                      type="date"
                      value={formDob}
                      onChange={(e) => setFormDob(e.target.value)}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>

                  <div className="grid gap-1 text-xs">
                    <label
                      htmlFor="gender"
                      className="text-[11px] font-medium text-muted-foreground"
                    >
                      Gender
                    </label>
                    <input
                      id="gender"
                      type="text"
                      value={formGender}
                      onChange={(e) => setFormGender(e.target.value)}
                      placeholder="Female, Male, Non-binary, etc."
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>

                  <div className="grid gap-1 text-xs">
                    <label
                      htmlFor="bloodType"
                      className="text-[11px] font-medium text-muted-foreground"
                    >
                      Blood type
                    </label>
                    <input
                      id="bloodType"
                      type="text"
                      value={formBloodType}
                      onChange={(e) => setFormBloodType(e.target.value)}
                      placeholder="A+, O-, AB+, etc."
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>

                  <div className="grid gap-1 text-xs">
                    <label
                      htmlFor="phone"
                      className="text-[11px] font-medium text-muted-foreground"
                    >
                      Phone
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="+977 9800000000"
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>

                  <div className="grid gap-1 text-xs">
                    <label
                      htmlFor="address"
                      className="text-[11px] font-medium text-muted-foreground"
                    >
                      Home address
                    </label>
                    <input
                      id="address"
                      type="text"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="City, area, street"
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                </div>
                <DialogFooter className="mt-2">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 px-3 text-xs font-semibold"
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save changes"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                    {isLoading ? "Loading..." : displayOrFallback(user?.name)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">
                    Date of birth
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {isLoading ? "Loading..." : formattedDob}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">Gender</p>
                  <p className="text-sm font-semibold text-foreground">
                    {isLoading ? "Loading..." : displayOrFallback(user?.gender)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">
                    Blood type
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {isLoading
                      ? "Loading..."
                      : displayOrFallback(user?.bloodType)}
                  </p>
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
                    {isLoading ? "Loading..." : displayOrFallback(user?.email)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">Phone</p>
                  <p className="flex items-center gap-1 text-sm font-semibold text-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {isLoading ? "Loading..." : displayOrFallback(user?.phone)}
                  </p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-[11px] text-muted-foreground">
                    Home address
                  </p>
                  <p className="flex items-center gap-1 text-sm font-semibold text-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {isLoading
                      ? "Loading..."
                      : displayOrFallback(user?.address)}
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
                    {isLoading
                      ? "Loading..."
                      : displayOrFallback(user?.preferredCommunication)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">
                    Primary care preference
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {isLoading
                      ? "Loading..."
                      : displayOrFallback(user?.primaryCarePreference)}
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

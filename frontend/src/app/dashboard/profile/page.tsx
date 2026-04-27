"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
import { Avatar, getStoredAvatar } from "@/components/ui/Avatar";
import { api } from "@/lib/apiClient";
import { RoleSidebar } from "@/components/layout/RoleSidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LocationPicker } from "@/components/location/LocationPicker";

type ProfileUser = {
  id: string;
  name: string;
  email: string;
  dateOfBirth: string | null;
  gender: string | null;
  bloodType: string | null;
  phone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const userQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const response = await api.get<{ user: ProfileUser }>("/auth/me");
      return response.data.user;
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
  const user = userQuery.data ?? null;
  const isLoading = userQuery.isLoading;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formDob, setFormDob] = useState("");
  const [formGender, setFormGender] = useState("");
  const [formBloodType, setFormBloodType] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formLatitude, setFormLatitude] = useState<number | null>(null);
  const [formLongitude, setFormLongitude] = useState<number | null>(null);
  const router = useRouter();

  const saveProfileMutation = useMutation({
    mutationFn: async (payload: {
      dateOfBirth: string | null;
      gender: string | null;
      bloodType: string | null;
      phone: string | null;
      address: string | null;
      latitude: number | null;
      longitude: number | null;
    }) => {
      const response = await api.patch<{ user: ProfileUser }>("/auth/me", payload);
      return response.data.user;
    },
    onSuccess: async (updatedUser) => {
      queryClient.setQueryData(["auth", "me"], updatedUser);
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      setIsDialogOpen(false);
      toast.success("Profile updated", {
        description: "Your changes have been saved.",
      });
    },
    onError: (error) => {
      console.error("Failed to save profile", error);
      toast.error("Profile update failed", {
        description: "Could not save your profile changes.",
      });
    },
  });
  const isSaving = saveProfileMutation.isPending;

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
    setFormLatitude(user.latitude ?? null);
    setFormLongitude(user.longitude ?? null);
    setIsDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    try {
      const payload = {
        dateOfBirth: formDob || null,
        gender: formGender || null,
        bloodType: formBloodType || null,
        phone: formPhone || null,
        address: formAddress || null,
        latitude: formLatitude,
        longitude: formLongitude,
      };

      await saveProfileMutation.mutateAsync(payload);
    } catch (error) {
      console.error("Failed to save profile", error);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
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
      <RoleSidebar role="user" onLogout={handleLogout} />

      <main className="flex min-h-full flex-1 flex-col overflow-y-auto">
        <header className="px-6 pb-4 pt-8 lg:px-8">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Profile
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Manage your personal details.
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

                  <LocationPicker
                    label="Home location"
                    address={formAddress}
                    latitude={formLatitude}
                    longitude={formLongitude}
                    onAddressChange={setFormAddress}
                    onLocationChange={({ address, latitude, longitude }) => {
                      setFormAddress(address);
                      setFormLatitude(latitude);
                      setFormLongitude(longitude);
                    }}
                    placeholder="Search your home location"
                  />
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
              <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <Avatar
                  src={getStoredAvatar()}
                  alt={user?.name ?? "User"}
                  size="lg"
                  editable
                />
                <div className="grid flex-1 gap-4 text-xs sm:grid-cols-2">
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
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-[11px] text-muted-foreground">Coordinates</p>
                  <p className="text-sm font-semibold text-foreground">
                    {isLoading
                      ? "Loading..."
                      : user?.latitude != null && user?.longitude != null
                        ? `${user.latitude.toFixed(5)}, ${user.longitude.toFixed(5)}`
                        : "Not set"}
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

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Mail, MapPin, Phone, Stethoscope } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/Avatar";
import { RoleSidebar } from "@/components/layout/RoleSidebar";
import { api } from "@/lib/apiClient";
import { uploadProfileImage } from "@/lib/cloudinary";
import { DOCTOR_SPECIALTIES, formatSpecialty } from "@/lib/specialties";
import { LocationPicker } from "@/components/location/LocationPicker";

type ProfileUser = {
  id: string;
  name: string;
  email: string;
  specialty: string | null;
  bio: string | null;
  phone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  profileImageUrl: string | null;
};

export default function DoctorProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formSpecialty, setFormSpecialty] = useState("");
  const [formBio, setFormBio] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formLatitude, setFormLatitude] = useState<number | null>(null);
  const [formLongitude, setFormLongitude] = useState<number | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        const res = await api.get<{ user: ProfileUser }>("/auth/me");
        if (!isMounted) return;
        setUser(res.data.user);
      } catch {
        if (!isMounted) return;
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const openDialog = () => {
    if (!user) return;
    setFormSpecialty(user.specialty ?? "");
    setFormBio(user.bio ?? "");
    setFormPhone(user.phone ?? "");
    setFormAddress(user.address ?? "");
    setFormLatitude(user.latitude ?? null);
    setFormLongitude(user.longitude ?? null);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await api.patch<{ user: ProfileUser }>("/auth/me", {
        specialty: formSpecialty || null,
        bio: formBio || null,
        phone: formPhone || null,
        address: formAddress || null,
        latitude: formLatitude,
        longitude: formLongitude,
      });
      setUser(res.data.user);
      setIsDialogOpen(false);
      toast.success("Profile updated", {
        description: "Doctor profile saved successfully.",
      });
    } catch {
      toast.error("Profile update failed", {
        description: "Could not save doctor profile.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      setIsUploadingAvatar(true);
      const profileImageUrl = await uploadProfileImage(file);
      const res = await api.patch<{ user: ProfileUser }>("/auth/me", {
        profileImageUrl,
      });
      setUser(res.data.user);
      toast.success("Profile image updated");
    } catch (error) {
      console.error("Profile image upload failed", error);
      toast.error("Image upload failed", {
        description:
          error instanceof Error
            ? error.message
            : "Check your Cloudinary cloud name and unsigned upload preset.",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleLogout = async () => {
    try {
      const _apiBase = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ?? "http://localhost:8000";
      await fetch(`${_apiBase}/api/auth/logout`, {
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

  const display = (v: string | null | undefined, fallback = "Not set") =>
    v && v.trim() ? v : fallback;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full flex-1 overflow-hidden">
      <RoleSidebar role="doctor" onLogout={handleLogout} />

      <main className="flex min-h-full flex-1 flex-col overflow-y-auto">
        <header className="px-6 pb-4 pt-8 lg:px-8">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Profile
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Manage your professional information visible to patients.
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-lg px-4 py-2 text-sm font-semibold"
                  onClick={openDialog}
                  disabled={isLoading || !user}
                >
                  Edit profile
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Edit profile</DialogTitle>
                  <DialogDescription>
                    Update your specialty, bio, and contact details.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-1 text-xs">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Specialty
                    </label>
                    <select
                      value={formSpecialty}
                      onChange={(e) => setFormSpecialty(e.target.value)}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="">Select specialty</option>
                      {DOCTOR_SPECIALTIES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1 text-xs">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Bio
                    </label>
                    <textarea
                      value={formBio}
                      onChange={(e) => setFormBio(e.target.value)}
                      placeholder="Brief professional bio..."
                      rows={3}
                      className="rounded-md border border-input bg-background px-2 py-2 text-xs"
                    />
                  </div>
                  <div className="grid gap-1 text-xs">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="+1 234 567 8900"
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    />
                  </div>
                  <LocationPicker
                    label="Doctor's clinic location"
                    address={formAddress}
                    latitude={formLatitude}
                    longitude={formLongitude}
                    onAddressChange={setFormAddress}
                    onLocationChange={({ address, latitude, longitude }) => {
                      setFormAddress(address);
                      setFormLatitude(latitude);
                      setFormLongitude(longitude);
                    }}
                    placeholder="Search clinic location"
                  />
                </div>
                <DialogFooter>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Saving…" : "Save"}
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
                  Professional information
                </CardTitle>
                <CardDescription className="text-xs">
                  Details shown to patients when booking.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <Avatar
                  src={user?.profileImageUrl}
                  alt={user?.name ?? "Doctor"}
                  size="lg"
                  editable
                  isUploading={isUploadingAvatar}
                  onImageChange={handleAvatarUpload}
                />
                <div className="grid flex-1 gap-4 text-xs sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">Name</p>
                    <p className="text-sm font-semibold">
                      {isLoading ? "Loading…" : display(user?.name)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">Specialty</p>
                    <p className="flex items-center gap-1 text-sm font-semibold">
                      <Stethoscope className="h-3.5 w-3.5" />
                      {isLoading ? "Loading…" : formatSpecialty(user?.specialty)}
                    </p>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-[11px] text-muted-foreground">Bio</p>
                    <p className="text-sm">{display(user?.bio)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/90 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Contact</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 text-xs sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{isLoading ? "…" : display(user?.email)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{isLoading ? "…" : display(user?.phone)}</span>
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{isLoading ? "…" : display(user?.address)}</span>
                </div>
                <div className="sm:col-span-2 text-[11px] text-muted-foreground">
                  {isLoading
                    ? "…"
                    : user?.latitude != null && user?.longitude != null
                      ? `Lat/Lng: ${user.latitude.toFixed(5)}, ${user.longitude.toFixed(5)}`
                      : "Lat/Lng: Not set"}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}

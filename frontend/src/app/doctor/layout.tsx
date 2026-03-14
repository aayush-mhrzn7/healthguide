"use client";

import { RoleGuard } from "@/components/auth/RoleGuard";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard allowed="doctor" fallbackPath="/dashboard">{children}</RoleGuard>;
}

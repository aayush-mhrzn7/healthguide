"use client";

import { RoleGuard } from "@/components/auth/RoleGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard allowed="user">{children}</RoleGuard>;
}

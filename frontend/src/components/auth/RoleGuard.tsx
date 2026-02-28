"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AllowedRole = "user" | "doctor" | "admin";

type RoleGuardProps = {
  children: React.ReactNode;
  allowed: AllowedRole | AllowedRole[];
  fallbackPath?: string;
};

type StoredUser = {
  id: string;
  name: string;
  email: string;
  role?: AllowedRole;
};

export function RoleGuard({
  children,
  allowed,
  fallbackPath = "login",
}: RoleGuardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">(
    "checking",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = window.localStorage.getItem("accessToken");
    const rawUser = window.localStorage.getItem("user");

    if (!token || !rawUser) {
      setStatus("denied");
      router.replace("login");
      return;
    }

    try {
      const user = JSON.parse(rawUser) as StoredUser;
      const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];

      if (!user.role || !allowedRoles.includes(user.role)) {
        setStatus("denied");
        router.replace(fallbackPath);
        return;
      }

      setStatus("allowed");
    } catch {
      setStatus("denied");
      router.replace("/login");
    }
  }, [allowed, fallbackPath, router]);

  if (status !== "allowed") {
    return (
      <div className="flex min-h-screen items-center justify-center text-xs text-muted-foreground">
        Checking permissions…
      </div>
    );
  }

  return <>{children}</>;
}

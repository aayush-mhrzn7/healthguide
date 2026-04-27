"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { api } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card/90 p-6 shadow-md">
        <p className="text-sm text-muted-foreground">Loading reset form...</p>
      </div>
    </div>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!token) {
      toast.error("Invalid reset link.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword });
      toast.success("Password changed successfully. Please log in.");
      router.push("/login");
    } catch (error) {
      const msg =
        (error as { response?: { data?: { error?: string } } }).response?.data
          ?.error ?? "Failed to reset password.";
      toast.error("Reset failed", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card/90 p-6 shadow-md">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Set a new password
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose a strong password (8+ chars, at least one letter and one number).
        </p>

        <div className="mt-4 space-y-3">
          <div className="grid gap-1">
            <label
              htmlFor="new-password"
              className="text-[11px] font-medium text-muted-foreground"
            >
              New password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <Button
            type="button"
            className="h-9 w-full"
            disabled={isSubmitting || !token}
            onClick={handleSubmit}
          >
            {isSubmitting ? "Saving..." : "Update password"}
          </Button>

          <div className="pt-1 text-center">
            <Link href="/login" className="text-xs text-primary hover:underline">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

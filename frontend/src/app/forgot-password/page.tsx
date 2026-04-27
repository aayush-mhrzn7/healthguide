"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { api } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const value = email.trim();
    if (!value) {
      toast.error("Enter your email first.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/auth/request-password-reset", { email: value });
      toast.success("If your account exists, a reset email has been sent.");
    } catch (error) {
      const msg =
        (error as { response?: { data?: { error?: string } } }).response?.data
          ?.error ?? "Failed to request reset email.";
      toast.error("Could not send reset email", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card/90 p-6 shadow-md">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Forgot password
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Enter your email and we&apos;ll send you a secure reset link.
        </p>

        <div className="mt-4 space-y-3">
          <div className="grid gap-1">
            <label htmlFor="email" className="text-[11px] font-medium text-muted-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <Button
            type="button"
            className="h-9 w-full"
            disabled={isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? "Sending..." : "Send reset email"}
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

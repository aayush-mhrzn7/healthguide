"use client";

import { Suspense } from "react";

import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading…</p>
        }
      >
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}

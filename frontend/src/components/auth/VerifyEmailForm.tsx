"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { CustomInput } from "@/components/form/customInput";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { api } from "@/lib/apiClient";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});

type Values = z.infer<typeof schema>;

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "doctor" | "admin";
  emailVerified?: boolean;
};

function redirectForRole(router: ReturnType<typeof useRouter>, role: AuthUser["role"]) {
  if (role === "admin") router.push("/admin");
  else if (role === "doctor") router.push("/doctor");
  else router.push("/dashboard");
}

export function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const [resending, setResending] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      email: initialEmail,
      code: "",
    },
  });

  const onSubmit = async (values: Values) => {
    try {
      const response = await api.post<{
        user: AuthUser;
        accessToken: string;
        alreadyVerified?: boolean;
      }>("/auth/verify-email", {
        email: values.email,
        code: values.code,
      });

      if (typeof window !== "undefined") {
        window.localStorage.setItem("accessToken", response.data.accessToken);
        window.localStorage.setItem("user", JSON.stringify(response.data.user));
      }

      if (response.data.alreadyVerified) {
        toast.message("Already verified", {
          description: "You are signed in.",
        });
      } else {
        toast.success("Email verified", {
          description: "Welcome to HealthGuide.",
        });
      }

      redirectForRole(router, response.data.user.role);
    } catch (error) {
      console.error("Verify email error", error);
      const apiMessage =
        (error as { response?: { data?: { error?: string } } }).response?.data
          ?.error ?? "Could not verify that code. Try again or request a new one.";
      toast.error("Verification failed", { description: apiMessage });
    }
  };

  const handleResend = useCallback(async () => {
    const email = form.getValues("email");
    if (!email || !z.string().email().safeParse(email).success) {
      toast.error("Enter your email first", {
        description: "We need your email address to resend the code.",
      });
      return;
    }
    setResending(true);
    try {
      await api.post("/auth/resend-verification", { email });
      toast.success("Code sent", {
        description: "Check your inbox for a new verification code.",
      });
    } catch (error) {
      const apiMessage =
        (error as { response?: { data?: { error?: string } } }).response?.data
          ?.error ?? "Could not resend the code.";
      toast.error("Resend failed", { description: apiMessage });
    } finally {
      setResending(false);
    }
  }, [form]);

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card/90 p-6 shadow-md">
      <div className="mb-5 space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Verify your email
        </h1>
        <p className="text-xs text-muted-foreground">
          Enter the 6-digit code we sent to your inbox. It expires in 15 minutes.
        </p>
      </div>

      <Form
        methods={form}
        className="space-y-4"
        onSubmit={form.handleSubmit(onSubmit, () => {
          toast.error("Please fix the highlighted fields.");
        })}
      >
        <CustomInput<Values>
          control={form.control}
          name="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
        />

        <CustomInput<Values>
          control={form.control}
          name="code"
          label="Verification code"
          placeholder="000000"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
        />

        <Button type="submit" className="mt-2 w-full h-9 text-sm font-semibold">
          Verify and continue
        </Button>
      </Form>

      <div className="mt-4 flex flex-col gap-2 text-center text-xs text-muted-foreground">
        <button
          type="button"
          className="text-primary underline-offset-4 hover:underline disabled:opacity-50"
          disabled={resending}
          onClick={() => void handleResend()}
        >
          {resending ? "Sending…" : "Resend code"}
        </button>
        <button
          type="button"
          className="text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => router.push("/login")}
        >
          Back to sign in
        </button>
      </div>
    </div>
  );
}

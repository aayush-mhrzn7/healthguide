"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { CustomInput } from "@/components/form/customInput";
import { PasswordInput } from "@/components/form/PasswordInput";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { api } from "@/lib/apiClient";
import {
  loginFormSchema,
  signupFormSchema,
  type LoginFormValues,
  type SignupFormValues,
} from "@/lib/authSchemas";

type Mode = "login" | "signup";

type AuthFormValues = LoginFormValues & { name?: string };

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "doctor" | "admin";
  emailVerified?: boolean;
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const schema = isSignup ? signupFormSchema : loginFormSchema;

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  });

  const onSubmit = async (values: AuthFormValues) => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string") {
          form.setError(key as keyof AuthFormValues, {
            type: "manual",
            message: issue.message,
          });
        }
      }
      toast.error("Please fix the highlighted fields.", {
        description:
          parsed.error.issues[0]?.message ?? "Check the form and try again.",
      });
      return;
    }
    const requestBody = parsed.data as SignupFormValues | LoginFormValues;
    try {
      const endpoint = mode === "signup" ? "/auth/signup" : "/auth/login";
      const response = await api.post<
        | { needsVerification: true; email: string }
        | { user: AuthUser; accessToken: string }
      >(endpoint, requestBody);

      if ("needsVerification" in response.data && response.data.needsVerification) {
        toast.success("Check your email", {
          description: "We sent a 6-digit code to verify your account.",
        });
        router.push(
          `/verify-email?email=${encodeURIComponent(response.data.email)}`,
        );
        return;
      }

      const session = response.data as { user: AuthUser; accessToken: string };

      if (typeof window !== "undefined") {
        window.localStorage.setItem("accessToken", session.accessToken);
        window.localStorage.setItem("user", JSON.stringify(session.user));
      }

      const role = session.user.role;

      toast.success(isSignup ? "Account created" : "Welcome back", {
        description: isSignup
          ? "You're all set. Taking you to your dashboard."
          : `Logged in as ${session.user.name ?? session.user.email}.`,
      });

      if (role === "admin") {
        router.push("/admin");
      } else if (role === "doctor") {
        router.push("/doctor");
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Auth error", error);

      const errData = (error as { response?: { data?: { error?: string; code?: string } } })
        .response?.data;

      if (
        mode === "login" &&
        errData?.code === "EMAIL_NOT_VERIFIED" &&
        requestBody.email
      ) {
        toast.message("Email not verified", {
          description: "Enter the code we sent you, or request a new one.",
        });
        router.push(
          `/verify-email?email=${encodeURIComponent(requestBody.email)}`,
        );
        return;
      }

      const fallbackMessage =
        mode === "signup"
          ? "Could not create your account. Please try again."
          : "Could not log you in. Please check your credentials.";

      const apiMessage = errData?.error ?? fallbackMessage;

      toast.error(mode === "signup" ? "Sign up failed" : "Login failed", {
        description: apiMessage,
      });
    }
  };

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card/90 p-6 shadow-md">
      <div className="mb-5 space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {isSignup ? "Create your HealthGuide account" : "Welcome back"}
        </h1>
        <p className="text-xs text-muted-foreground">
          {isSignup
            ? "Sign up in seconds to save assessments and sync across devices."
            : "Log in to continue where you left off."}
        </p>
      </div>

      <Form
        methods={form}
        className="space-y-4"
        onSubmit={form.handleSubmit(onSubmit, () => {
          toast.error("Please fix the highlighted fields.", {
            description:
              mode === "signup"
                ? "Name, email, and password must be valid before continuing."
                : "Email and password must be valid before continuing.",
          });
        })}
      >
        {isSignup && (
          <CustomInput<AuthFormValues>
            control={form.control}
            name="name"
            label="Full name"
            placeholder="Jane Doe"
          />
        )}

        <CustomInput<AuthFormValues>
          control={form.control}
          name="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
        />

        <PasswordInput<AuthFormValues>
          control={form.control}
          name="password"
          label="Password"
          placeholder="••••••••"
          showRealtimeValidation={isSignup}
        />

        <Button
          type="submit"
          className="mt-2 w-full h-9 text-sm font-semibold"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isSignup ? "Creating account…" : "Logging in…"}
            </>
          ) : (
            isSignup ? "Create account" : "Log in"
          )}
        </Button>
      </Form>
    </div>
  );
}

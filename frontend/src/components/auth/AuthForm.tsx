"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { CustomInput } from "@/components/form/customInput";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { api } from "@/lib/apiClient";

type Mode = "login" | "signup";

const baseSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  name: z.string().optional(),
});

const signupSchema = baseSchema.extend({
  name: z.string().min(1, "Name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const loginSchema = baseSchema.omit({ name: true });

type AuthValues = z.infer<typeof baseSchema>;

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "doctor" | "admin";
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();

  const form = useForm<AuthValues>({
    // @ts-ignore
    resolver: zodResolver(mode === "signup" ? signupSchema : loginSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  });

  const onSubmit = async (values: AuthValues) => {
    try {
      const endpoint = mode === "signup" ? "/auth/signup" : "/auth/login";
      const response = await api.post<{
        user: AuthUser;
        accessToken: string;
      }>(endpoint, values);

      if (typeof window !== "undefined") {
        window.localStorage.setItem("accessToken", response.data.accessToken);
        window.localStorage.setItem("user", JSON.stringify(response.data.user));
      }

      const role = response.data.user.role;

      if (role === "admin") {
        router.push("/admin");
      } else if (role === "doctor") {
        router.push("/doctor");
      } else {
        router.push("/dashboard/profile");
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Auth error", error);

      const fallbackMessage =
        mode === "signup"
          ? "Could not create your account. Please try again."
          : "Could not log you in. Please check your credentials.";

      const apiMessage =
        (error as { response?: { data?: { error?: string } } }).response?.data
          ?.error ?? fallbackMessage;

      toast.error(mode === "signup" ? "Sign up failed" : "Login failed", {
        description: apiMessage,
      });
    }
  };

  const isSignup = mode === "signup";

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
          <CustomInput<AuthValues>
            control={form.control}
            name="name"
            label="Full name"
            placeholder="Jane Doe"
          />
        )}

        <CustomInput<AuthValues>
          control={form.control}
          name="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
        />

        <CustomInput<AuthValues>
          control={form.control}
          name="password"
          label="Password"
          type="password"
          placeholder="••••••••"
        />

        <Button type="submit" className="mt-2 w-full h-9 text-sm font-semibold">
          {isSignup ? "Create account" : "Log in"}
        </Button>
      </Form>
    </div>
  );
}

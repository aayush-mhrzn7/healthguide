"use client"

import { useForm } from "react-hook-form"

import { CustomInput } from "@/components/form/customInput"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"

type Mode = "login" | "signup"

type AuthValues = {
  email: string
  password: string
  name?: string
}

export function AuthForm({ mode }: { mode: Mode }) {
  const form = useForm<AuthValues>({
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  })

  const onSubmit = (values: AuthValues) => {
    console.log(mode.toUpperCase(), values)
  }

  const isSignup = mode === "signup"

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
        onSubmit={form.handleSubmit(onSubmit)}
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

        <Button
          type="submit"
          className="mt-2 w-full h-9 text-sm font-semibold"
        >
          {isSignup ? "Create account" : "Log in"}
        </Button>
      </Form>
    </div>
  )
}


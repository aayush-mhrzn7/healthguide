"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function Hero() {
  const router = useRouter();

  const handleStart = () => {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("accessToken")
        : null;
    router.push(token ? "/dashboard/assessment" : "/signup");
  };

  return (
    <section className="flex min-h-[70vh] w-full items-center justify-center border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-12 lg:flex-row lg:px-8 lg:py-16">
        <div className="relative flex flex-1 flex-col justify-center gap-6 animate-in fade-in slide-in-from-left-6 duration-700">
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Smart disease prediction &amp;{" "}
            <span className="text-primary">doctor recommendations</span>
          </h1>
          <p className="max-w-xl text-base sm:text-lg text-muted-foreground">
            HealthGuide analyzes your symptoms, highlights potential risks, and
            connects you to the right specialist in minutes.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={handleStart}
              className="h-11 rounded-lg px-6 text-sm font-semibold"
            >
              Start health assessment
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

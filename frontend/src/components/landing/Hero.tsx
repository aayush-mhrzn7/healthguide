import Image from "next/image";

import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="w-full min-h-[70vh] flex justify-center items-center border-border  ">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-12 lg:flex-row lg:px-8 lg:py-16">
        <div className="relative flex flex-1 flex-col justify-center gap-6 animate-in fade-in slide-in-from-left-6 duration-700">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-tight backdrop-blur"></div>
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Smart disease prediction &amp;{" "}
            <span className="text-sky-400">doctor recommendations</span>
          </h1>
          <p className="max-w-xl text-base  sm:text-lg">
            HealthGuide analyzes your symptoms, highlights potential risks, and
            connects you to the right specialist in minutes.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="h-11 rounded-lg bg-sky-500 px-6 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 hover:bg-sky-500/90"
            >
              Start health assessment
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

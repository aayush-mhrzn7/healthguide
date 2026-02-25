import { Button } from "@/components/ui/button";

export function Cta() {
  return (
    <section className="w-full min-h-[600px] flex justify-center items-center bg-gradient-to-b from-primary to-primary/90 text-primary-foreground">
      <div className="mx-auto max-w-5xl px-4 py-14 lg:px-8 lg:py-18">
        <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 via-white/5 to-white/0 px-6 py-12 text-center shadow-xl lg:px-10 lg:py-14">
          <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_top,_white_0,_transparent_55%)]" />
          <div className="relative mx-auto max-w-2xl space-y-5">
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Take control of your health, one question at a time.
            </h2>
            <p className="text-sm text-primary-foreground/80 sm:text-base">
              Join thousands of people using HealthGuide to turn vague worries
              into concrete, doctor-ready insights.
            </p>
            <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="h-11 min-w-[200px] rounded-lg bg-background text-primary shadow-lg shadow-black/20 hover:bg-background/90"
              >
                Start free assessment
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-11 min-w-[200px] rounded-lg border-white/70 bg-transparent text-primary-foreground hover:bg-white/10"
              >
                Learn more
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

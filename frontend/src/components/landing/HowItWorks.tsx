const STEPS = [
  {
    title: "Share what you feel",
    description: "Describe your symptoms in your own words—no medical jargon required.",
  },
  {
    title: "AI analyzes patterns",
    description:
      "Our engine cross-checks your inputs against medical literature and outcome data.",
  },
  {
    title: "Get a guided next step",
    description:
      "See likely causes, urgency level, and recommended type of specialist if needed.",
  },
]

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="w-full bg-background"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-16 lg:flex-row lg:items-center lg:px-8">
        <div className="flex flex-1 flex-col gap-4 animate-in fade-in slide-in-from-left-4 duration-500">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            From symptoms to clarity in minutes
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            HealthGuide turns a few simple questions into a structured health
            snapshot you can share with your doctor, reducing guesswork in your
            first visit.
          </p>
          <ul className="mt-4 flex flex-col gap-4">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="flex gap-4 rounded-xl bg-card/80 p-4 shadow-xs ring-1 ring-border/60 animate-in fade-in slide-in-from-bottom-3 duration-500"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-1 items-center justify-center animate-in fade-in slide-in-from-right-4 duration-500 delay-150">
          <div className="relative w-full max-w-sm rounded-3xl border border-dashed border-primary/40 bg-primary/5 p-5 shadow-sm">
            <div className="flex flex-col gap-3 text-xs">
              <div className="rounded-2xl bg-background/80 p-3 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Symptom summary
                  </span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
                    Low urgency
                  </span>
                </div>
                <p className="mt-2 text-xs text-foreground/90">
                  Mild chest tightness when climbing stairs, occasional dizziness,
                  no pain at rest.
                </p>
              </div>

              <div className="rounded-2xl bg-background/80 p-3 shadow-xs">
                <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Suggested specialist</span>
                  <span className="text-foreground/80">Cardiologist</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-2/3 rounded-full bg-primary" />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  2 available within 10km, earliest appointment tomorrow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


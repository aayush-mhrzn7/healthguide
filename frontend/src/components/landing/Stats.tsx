const STATS = [
  { label: "Active users", value: "50k+" },
  { label: "Model accuracy", value: "98%" },
  { label: "Assessments run", value: "1M+" },
  { label: "Specialists in network", value: "2,500" },
]

export function Stats() {
  return (
    <section className="w-full border-y border-border bg-card/60">
      <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8 lg:py-12">
        <div className="grid gap-6 text-center sm:grid-cols-2 md:grid-cols-4">
          {STATS.map((stat, index) => (
            <div
              key={stat.label}
              className="flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span className="text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
                {stat.value}
              </span>
              <span className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


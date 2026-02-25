import { Brain, ShieldCheck, BadgeCheck } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const FEATURES = [
  {
    Icon: Brain,
    title: "AI-powered triage",
    description:
      "Advanced models compare your symptoms against millions of anonymized records to surface likely conditions in seconds.",
  },
  {
    Icon: ShieldCheck,
    title: "Private by design",
    description:
      "Your data stays encrypted in transit and at rest, with strict access controls and audit trails for every access.",
  },
  {
    Icon: BadgeCheck,
    title: "Clinically vetted",
    description:
      "Our medical advisory board of board-certified specialists continuously reviews and tunes HealthGuide’s recommendations.",
  },
]

export function Features() {
  return (
    <section className="w-full bg-background">
      <div className="mx-auto max-w-5xl px-4 py-14 lg:px-8 lg:py-16">
        <div className="mx-auto mb-10 flex max-w-2xl flex-col gap-3 text-left md:text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Why people trust HealthGuide
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            We combine medical expertise with carefully evaluated AI models to
            give you calm, clear next steps—not alarm.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <Card
              key={feature.title}
              className="group h-full border-border/80 bg-card/80 shadow-xs transition-all hover:-translate-y-1 hover:border-primary/60 hover:shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <CardHeader className="flex flex-col gap-4 border-none pb-0">
                <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.Icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-base font-semibold">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}


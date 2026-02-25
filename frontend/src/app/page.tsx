import { Cta } from "@/components/landing/Cta"
import { Features } from "@/components/landing/Features"
import { Hero } from "@/components/landing/Hero"
import { HowItWorks } from "@/components/landing/HowItWorks"
import { Stats } from "@/components/landing/Stats"

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <Stats />
      <HowItWorks />
      <Cta />
    </>
  )
}


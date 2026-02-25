"use client"

import { usePathname } from "next/navigation"

import { Footer } from "@/components/landing/Footer"
import { Header } from "@/components/landing/Header"
import { ThemeProvider } from "@/components/theme/theme-provider"

type AppShellProps = {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const isDashboard = pathname?.startsWith("/dashboard")

  if (isDashboard) {
    return (
      <ThemeProvider>
        <div className="flex min-h-screen flex-col">{children}</div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </ThemeProvider>
  )
}


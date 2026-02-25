import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import { AppShell } from "@/components/layout/AppShell";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HealthGuide",
  description: "Smart disease prediction and doctor recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${manrope.variable} font-sans antialiased bg-background text-foreground`}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

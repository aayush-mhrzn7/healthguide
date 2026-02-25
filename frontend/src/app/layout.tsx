import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import { AppShell } from "@/components/layout/AppShell";

import "./globals.css";
import Script from "next/script";
import Head from "next/head";

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
        {process.env.NODE_ENV === "development" && (
          <script
            src="https://unpkg.com/react-scan/dist/auto.global.js"
            crossOrigin="anonymous"
          />
        )}
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

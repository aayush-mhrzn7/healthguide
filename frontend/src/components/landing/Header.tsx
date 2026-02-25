import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Brain } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Brain />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold tracking-tight">
              HealthGuide
            </span>
            <span className="text-xs text-muted-foreground">
              Smart health insights, instantly.
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <Link
            href="#how-it-works"
            className="transition-colors hover:text-foreground"
          >
            How it works
          </Link>
          <Link
            href="#specialists"
            className="transition-colors hover:text-foreground"
          >
            Specialists
          </Link>
          <Link
            href="#about-ai"
            className="transition-colors hover:text-foreground"
          >
            About AI
          </Link>
          <Link
            href="#contact"
            className="transition-colors hover:text-foreground"
          >
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href={"/login"}>
            <Button
              variant="ghost"
              size="sm"
              className="hidden text-xs font-medium md:inline-flex"
            >
              Log in
            </Button>
          </Link>
          <Link href={"/signup"}>
            {" "}
            <Button
              size="sm"
              className="rounded-full px-5 text-xs font-semibold shadow-xs hover:shadow-sm transition-shadow"
            >
              Get started
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

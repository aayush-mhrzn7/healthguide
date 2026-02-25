import { Brain } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-background pt-12 pb-6">
      <div className="mx-auto max-w-5xl px-4 lg:px-8">
        <div className="grid grid-cols-2 gap-8 text-sm md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 space-y-3 lg:col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded bg-primary text-primary-foreground">
                <span className="p-2">
                  <Brain />
                </span>
              </div>
              <span className="text-base font-semibold tracking-tight">
                HealthGuide
              </span>
            </div>
            <p className="max-w-sm text-xs text-muted-foreground">
              Making preventative care and early guidance accessible to anyone
              with an internet connection—no waiting room required.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-5 text-xs text-muted-foreground md:flex-row">
          <p>
            © {new Date().getFullYear()} HealthGuide Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

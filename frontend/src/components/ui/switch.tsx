"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(function Switch({ className, ...props }, ref) {
  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border border-input bg-muted transition-colors data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block size-3 rounded-full bg-background shadow transition-transform data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0",
        )}
      />
    </SwitchPrimitives.Root>
  )
})

export { Switch }


import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-field w-full min-w-0 rounded-md border border-input bg-card px-3 text-field text-foreground transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-small file:font-medium file:text-foreground placeholder:text-muted-foreground hover:border-border-strong focus-visible:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive-tint",
        className
      )}
      {...props}
    />
  )
}

export { Input }

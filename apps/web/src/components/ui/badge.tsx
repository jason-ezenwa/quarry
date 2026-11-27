import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

// Status pills: solid, with light mono text naming where something stands.
const badgeVariants = cva(
  "inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-sm px-2 text-pill whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        ready: "bg-status-ready text-status-ready-foreground",
        interview: "bg-status-interview text-status-interview-foreground",
        drafting: "bg-status-drafting text-status-drafting-foreground",
        neutral: "bg-muted text-muted-foreground",
        // The private beta label on the landing page: a matcha pill, led by a moss dot.
        beta: "gap-2 rounded-full bg-beta-tint px-2.5 text-beta before:size-1.5 before:rounded-full before:bg-beta",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

function Badge({
  className,
  variant = "neutral",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

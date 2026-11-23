import * as React from "react"
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle"
import { CircleNotchIcon } from "@phosphor-icons/react/dist/csr/CircleNotch"
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// progress while background work runs, review when it needs the user, danger when it failed.
const calloutVariants = cva(
  "flex min-h-13 flex-wrap items-start gap-3 rounded-lg py-2.5 pr-2.5 pl-3.5 sm:flex-nowrap sm:items-center",
  {
    variants: {
      tone: {
        progress: "bg-card ring-1 ring-border *:data-[slot=callout-lead]:text-muted-foreground",
        review: "bg-fit-tint *:data-[slot=callout-lead]:text-fit",
        danger: "bg-destructive-tint text-destructive-ink *:data-[slot=callout-lead]:text-destructive-ink",
      },
    },
    defaultVariants: {
      tone: "progress",
    },
  }
)

type CalloutTone = NonNullable<VariantProps<typeof calloutVariants>["tone"]>

function CalloutLead({ tone }: { tone: CalloutTone }) {
  if (tone === "progress") {
    return <CircleNotchIcon weight="bold" className="size-4 animate-spin" aria-hidden="true" />
  }

  const Icon = tone === "danger" ? WarningCircleIcon : CheckCircleIcon
  return <Icon weight="fill" className="size-4" aria-hidden="true" />
}

function Callout({
  className,
  tone = "progress",
  children,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof calloutVariants>) {
  const resolvedTone = tone ?? "progress"

  return (
    <div
      data-slot="callout"
      data-tone={resolvedTone}
      role={resolvedTone === "danger" ? "alert" : "status"}
      className={cn(calloutVariants({ tone: resolvedTone }), className)}
      {...props}
    >
      <span data-slot="callout-lead" className="flex pt-0.5 sm:pt-0">
        <CalloutLead tone={resolvedTone} />
      </span>
      {children}
    </div>
  )
}

function CalloutContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="callout-content"
      className={cn("flex min-w-0 flex-1 flex-col gap-px", className)}
      {...props}
    />
  )
}

function CalloutTitle({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="callout-title" className={cn("text-ui-strong", className)} {...props} />
}

function CalloutMeta({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="callout-meta"
      className={cn("text-label wrap-anywhere text-muted-foreground", className)}
      {...props}
    />
  )
}

// On phones the actions drop below the title, lined up with it.
function CalloutActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="callout-actions"
      className={cn("flex w-full items-center gap-1.5 pl-7 sm:w-auto sm:pl-0", className)}
      {...props}
    />
  )
}

export { Callout, CalloutContent, CalloutTitle, CalloutMeta, CalloutActions }

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"
import { Spinner } from "@/components/ui/spinner"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent text-small font-medium whitespace-nowrap transition-colors select-none active:not-aria-[haspopup]:translate-y-[0.5px] disabled:pointer-events-none disabled:not-data-loading:opacity-45 data-loading:[&_[data-icon=inline-start]:not([data-slot=spinner])]:hidden aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[15px]",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary:
          "border-border bg-secondary text-secondary-foreground hover:border-border-strong hover:bg-secondary-hover aria-expanded:border-border-strong aria-expanded:bg-secondary-hover",
        ghost:
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground",
        destructive:
          "border-border bg-secondary text-destructive-ink hover:border-destructive hover:bg-destructive-tint",
        link: "text-foreground underline underline-offset-3 hover:text-primary",
      },
      size: {
        default:
          "h-control gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        sm: "h-control-sm gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-control-lg gap-2 px-3.5 text-ui-strong has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-control",
        "icon-sm": "size-control-sm [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-control-lg",
        // The 44px touch target in the phone top bar.
        "icon-touch": "size-11 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    // Sizes add side padding and height, but a link sits flush with the text around it.
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: {
      variant: "secondary",
      size: "default",
    },
  }
)

// loading disables the button and swaps the leading icon for a spinner.
function Button({
  className,
  variant = "secondary",
  size = "default",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {/* Slot needs its one child alone, so asChild never gets the spinner. */}
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <Spinner data-icon="inline-start" aria-hidden="true" className="text-current" /> : null}
          {children}
        </>
      )}
    </Comp>
  )
}

export { Button, buttonVariants }

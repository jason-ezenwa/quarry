import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// A thin bar for a known range, using the native element so no width is set inline.
// Chrome paints the fill with a gradient image, so each fill also clears the image.
const meterVariants = cva(
  "block h-1 w-full appearance-none overflow-hidden rounded-full border-0 [&::-moz-meter-bar]:rounded-full [&::-moz-meter-bar]:bg-fit [&::-moz-meter-bar]:bg-none [&::-webkit-meter-bar]:h-1 [&::-webkit-meter-bar]:rounded-full [&::-webkit-meter-bar]:border-0 [&::-webkit-meter-even-less-good-value]:bg-fit [&::-webkit-meter-even-less-good-value]:bg-none [&::-webkit-meter-optimum-value]:rounded-full [&::-webkit-meter-optimum-value]:bg-fit [&::-webkit-meter-optimum-value]:bg-none [&::-webkit-meter-suboptimum-value]:bg-fit [&::-webkit-meter-suboptimum-value]:bg-none",
  {
    variants: {
      track: {
        // On the sidebar's usage card.
        soft: "bg-border-soft [&::-webkit-meter-bar]:bg-border-soft",
        // On a document sheet.
        line: "bg-border [&::-webkit-meter-bar]:bg-border",
      },
    },
    defaultVariants: { track: "soft" },
  }
)

function Meter({
  className,
  track,
  ...props
}: React.ComponentProps<"meter"> & VariantProps<typeof meterVariants>) {
  return <meter data-slot="meter" className={cn(meterVariants({ track }), className)} {...props} />
}

export { Meter }

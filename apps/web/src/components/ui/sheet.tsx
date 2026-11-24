import * as React from "react"
import { cn } from "@/lib/utils"
import { Dialog as SheetPrimitive } from "radix-ui"

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-scrim duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

// Slides in from an edge. The caller sets the surface, so the sidebar can keep its plaster ground.
function SheetContent({
  className,
  children,
  side = "left",
  hideFrom,
  size = "menu",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "left" | "right"
  // menu: a narrow sheet such as the phone menu. document: the whole screen on phones, a wide sheet above that.
  size?: "menu" | "document"
  // Hides the sheet and its scrim from this breakpoint up, for a menu that only phones use.
  hideFrom?: "md"
}) {
  const hidden = hideFrom === "md" && "md:hidden"

  return (
    <SheetPrimitive.Portal>
      <SheetOverlay className={cn(hidden)} />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        data-size={size}
        className={cn(
          hidden,
          "fixed inset-y-0 z-50 flex h-full w-3/4 max-w-72 data-[size=document]:w-full data-[size=document]:max-w-none sm:data-[size=document]:max-w-xl flex-col bg-panel text-ui text-foreground shadow-lifted outline-none transition ease-in-out data-[side=left]:left-0 data-[side=right]:right-0 data-open:animate-in data-open:duration-200 data-closed:animate-out data-closed:duration-150 data-[side=left]:data-open:slide-in-from-left data-[side=left]:data-closed:slide-out-to-left data-[side=right]:data-open:slide-in-from-right data-[side=right]:data-closed:slide-out-to-right",
          className
        )}
        {...props}
      >
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-ui-strong text-foreground", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-small text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription }

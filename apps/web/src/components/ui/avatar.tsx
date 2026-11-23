import * as React from "react"
import { cn } from "@/lib/utils"
import { Avatar as AvatarPrimitive } from "radix-ui"

// Initials in a moss circle: 24px in the sidebar, 40px on the profile.
function Avatar({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: "default" | "sm" | "lg"
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "group/avatar relative flex size-8 shrink-0 rounded-full select-none data-[size=lg]:size-10 data-[size=sm]:size-6",
        className
      )}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-fit text-fit-foreground text-ui-strong group-data-[size=sm]/avatar:text-doc-caps",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarFallback }

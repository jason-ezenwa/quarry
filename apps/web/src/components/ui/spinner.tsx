import { CircleNotchIcon } from "@phosphor-icons/react/dist/csr/CircleNotch"
import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <CircleNotchIcon
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      weight="bold"
      className={cn("size-4 animate-spin text-icon", className)}
      {...props}
    />
  )
}

export { Spinner }

import * as React from "react"
import { cn } from "@/lib/utils"
import { CaretUpDownIcon } from "@phosphor-icons/react/dist/csr/CaretUpDown"

type NativeSelectProps = React.ComponentProps<"select">

function NativeSelect({
  className,
  ...props
}: NativeSelectProps) {
  return (
    <div
      className={cn(
        "group/native-select relative w-fit has-[select:disabled]:opacity-45",
        className
      )}
      data-slot="native-select-wrapper"
    >
      <select
        data-slot="native-select"
          className="h-field w-full min-w-0 cursor-pointer appearance-none rounded-md border border-input bg-card pr-9 pl-3 text-field text-foreground transition-colors outline-none hover:border-border-strong focus-visible:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive-tint"
        {...props}
      />
      <CaretUpDownIcon className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-icon select-none" aria-hidden="true" data-slot="native-select-icon" />
    </div>
  )
}

function NativeSelectOption({
  className,
  ...props
}: React.ComponentProps<"option">) {
  return (
    <option
      data-slot="native-select-option"
      className={cn("bg-card text-foreground", className)}
      {...props}
    />
  )
}

export { NativeSelect, NativeSelectOption }

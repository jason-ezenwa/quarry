import * as React from "react"
import { CaretUpDownIcon } from "@phosphor-icons/react/dist/csr/CaretUpDown"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type ComboboxOption = { value: string; label: string }

type ComboboxProps = Omit<React.ComponentProps<"button">, "value" | "onChange"> & {
  options: readonly ComboboxOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
}

// A select whose options can be searched by label. The trigger is a field-sized button with role combobox.
function Combobox({
  options,
  value,
  onChange,
  placeholder = "Choose an option",
  searchPlaceholder = "Search",
  emptyMessage = "No matches",
  className,
  onBlur,
  ...props
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const selected = options.find((option) => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          data-slot="combobox-trigger"
          data-placeholder={selected ? undefined : ""}
          onBlur={onBlur}
          className={cn(
            "flex h-field w-full min-w-0 items-center justify-between gap-1.5 rounded-md border border-input bg-card pr-3 pl-3 text-left text-field text-foreground transition-colors outline-none hover:border-border-strong focus-visible:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive-tint data-placeholder:text-muted-foreground",
            className
          )}
          {...props}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <CaretUpDownIcon className="pointer-events-none size-3.5 shrink-0 text-icon" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-56 p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.label}
                keywords={[option.value]}
                data-checked={option.value === value}
                onSelect={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                {option.label}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export { Combobox }
export type { ComboboxOption }

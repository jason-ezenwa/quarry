import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check"
import { cn } from "@/lib/utils"

type ChoiceChipsProps<T extends string> = Omit<React.ComponentProps<"div">, "onChange"> & {
  options: ReadonlyArray<{ value: T; label: string }>
  value: T[]
  onChange: (value: T[]) => void
  invalid?: boolean
}

// Toggle chips for picking one or more options. Selected chips get an ink outline and a check.
function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  invalid,
  className,
  ...props
}: ChoiceChipsProps<T>) {
  function toggle(option: T) {
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option])
  }

  return (
    <div
      role="group"
      data-slot="choice-chips"
      data-invalid={invalid || undefined}
      className={cn("group/choice-chips flex flex-wrap gap-2", className)}
      {...props}
    >
      {options.map((option) => {
        const selected = value.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(option.value)}
            className="inline-flex h-control-lg items-center gap-1.5 rounded-md border border-input bg-card px-3.5 text-ui text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground group-data-invalid/choice-chips:border-destructive aria-pressed:border-foreground aria-pressed:text-ui-strong aria-pressed:text-foreground"
          >
            {selected ? <CheckIcon weight="bold" className="size-3.5" aria-hidden="true" /> : null}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export { ChoiceChips }

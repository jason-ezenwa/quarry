import { useState, type KeyboardEvent } from "react"
import { XIcon } from "@phosphor-icons/react/dist/csr/X"
import { cn } from "@/lib/utils"

type ChipInputProps = Omit<React.ComponentProps<"input">, "value" | "onChange" | "onKeyDown" | "max"> & {
  value: string[]
  onChange: (value: string[]) => void
  max?: number
  // Called with the typed value when adding it would go past max; the value stays in the input.
  onLimit?: (rejected: string) => void
}

// Type a value and press Enter to add it as a removable chip. Past max, nothing is added and onLimit fires.
function ChipInput({ value, onChange, max, onLimit, className, onBlur, ...props }: ChipInputProps) {
  const [draft, setDraft] = useState("")
  const full = max !== undefined && value.length >= max

  function commit() {
    const next = draft.trim()
    if (!next) return
    if (full) {
      onLimit?.(next)
      return
    }
    setDraft("")
    if (!value.includes(next)) onChange([...value, next])
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      // Enter adds a chip; it never submits the surrounding form.
      event.preventDefault()
      commit()
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div
      data-slot="chip-input"
      className={cn(
        "flex min-h-field w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-card px-2 py-1.5 transition-colors hover:border-border-strong has-[input:focus-visible]:border-border-strong has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:ring-3 has-[[aria-invalid=true]]:ring-destructive-tint",
        className
      )}
    >
      {value.map((chip) => (
        <span
          key={chip}
          data-slot="chip"
          className="inline-flex h-6.5 items-center gap-1 rounded-md bg-muted pr-1 pl-2.5 text-ui text-foreground"
        >
          {chip}
          <button
            type="button"
            aria-label={`Remove ${chip}`}
            onClick={() => onChange(value.filter((item) => item !== chip))}
            className="flex size-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <XIcon className="size-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
          {...props}
          data-slot="chip-input-control"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={(event) => {
            commit()
            onBlur?.(event)
          }}
          className="min-w-30 flex-1 bg-transparent px-1 py-0.5 text-field text-foreground outline-none placeholder:text-muted-foreground"
        />
    </div>
  )
}

export { ChipInput }

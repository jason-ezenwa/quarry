import { resumeSchema, type Resume } from "@quarry/contracts"
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/csr/PencilSimple"
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus"
import { XIcon } from "@phosphor-icons/react/dist/csr/X"
import { useId, useState, type ReactNode } from "react"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { ChipInput } from "@/components/ui/chip-input"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  fieldKey,
  ResumeEditorContext,
  useResumeEditor,
  type ResumeEditorContextValue,
  type ResumeFieldPath,
} from "./resume-editor-context"

const DATE_FIELDS = new Set(["startDate", "endDate", "date"])

type Draft = Record<string | number, unknown>

function getIn(value: unknown, path: ResumeFieldPath): unknown {
  return path.reduce<unknown>((current, segment) => (current as Draft | undefined)?.[segment], value)
}

function setIn<T>(value: T, path: ResumeFieldPath, next: unknown): T {
  if (path.length === 0) return next as T
  const [head, ...rest] = path
  const copy = (Array.isArray(value) ? [...value] : { ...(value as object) }) as Draft
  copy[head] = setIn(copy[head], rest, next)
  return copy as T
}

// Trims every string, drops blank optional fields and blank list items, so an untouched empty field is never sent.
function normalize(value: unknown): unknown {
  if (typeof value === "string") return value.trim()
  if (Array.isArray(value)) {
    return value.map(normalize).filter((item) => item !== "")
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value).map(([key, item]) => [key, normalize(item)] as const)
    return Object.fromEntries(entries.filter(([, item]) => item !== ""))
  }
  return value
}

function issueMessage(issue: z.core.$ZodIssue): string {
  const field = issue.path.at(-1)
  if (field === "url") return "Use a full link, starting with https://"
  if (typeof field === "string" && DATE_FIELDS.has(field)) return "Use YYYY or YYYY-MM"
  return "Required"
}

function toErrors(issues: z.core.$ZodIssue[]): Record<string, string> {
  return Object.fromEntries(issues.map((issue) => [fieldKey(issue.path as ResumeFieldPath), issueMessage(issue)]))
}

type ResumeEditorProviderProps = {
  resume: Resume
  onSave: (resume: Resume) => Promise<void>
  children: ReactNode
}

// Holds the draft in local state and validates it with the shared resume schema before saving.
function ResumeEditorProvider({ resume, onSave, children }: ResumeEditorProviderProps) {
  const [draft, setDraft] = useState(resume)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function save() {
    const result = resumeSchema.safeParse(normalize(draft))

    if (!result.success) {
      setErrors(toErrors(result.error.issues))
      return
    }

    setErrors({})
    setSaveError(null)
    setSaving(true)

    try {
      await onSave(result.data)
    } catch {
      setSaveError("We could not save your resume. Try again.")
    } finally {
      setSaving(false)
    }
  }

  const value: ResumeEditorContextValue = {
    state: { draft },
    actions: {
      setField: (path, next) => setDraft((current) => setIn(current, path, next)),
      addItem: (path, item) =>
        setDraft((current) => setIn(current, path, [...(getIn(current, path) as unknown[]), item])),
      removeItem: (path, index) =>
        setDraft((current) =>
          setIn(current, path, (getIn(current, path) as unknown[]).filter((_, position) => position !== index)),
        ),
      save,
    },
    meta: { errors, saving, saveError },
  }

  return <ResumeEditorContext value={value}>{children}</ResumeEditorContext>
}

type ResumeEditorFieldProps = Omit<React.ComponentProps<"input">, "value" | "onChange"> & {
  path: ResumeFieldPath
  label: string
  // Visible labels sit above the control; a hidden label still names it for assistive tech.
  hideLabel?: boolean
}

function ResumeEditorField({ path, label, hideLabel, className, ...props }: ResumeEditorFieldProps) {
  const id = useId()
  const { state, actions, meta } = useResumeEditor()
  const error = meta.errors[fieldKey(path)]

  return (
    <Field className={className}>
      <FieldLabel htmlFor={id} className={cn(hideLabel && "sr-only")}>
        {label}
      </FieldLabel>
      <Input
        id={id}
        value={(getIn(state.draft, path) as string | undefined) ?? ""}
        onChange={(event) => actions.setField(path, event.target.value)}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  )
}

type ResumeEditorTextAreaProps = Omit<React.ComponentProps<"textarea">, "value" | "onChange"> & {
  path: ResumeFieldPath
  label: string
  hideLabel?: boolean
}

function ResumeEditorTextArea({ path, label, hideLabel, className, ...props }: ResumeEditorTextAreaProps) {
  const id = useId()
  const { state, actions } = useResumeEditor()

  return (
    <Field className={className}>
      <FieldLabel htmlFor={id} className={cn(hideLabel && "sr-only")}>
        {label}
      </FieldLabel>
      <Textarea
        id={id}
        value={(getIn(state.draft, path) as string | undefined) ?? ""}
        onChange={(event) => actions.setField(path, event.target.value)}
        {...props}
      />
    </Field>
  )
}

// Edits a list of { name } items, such as skills, as chips.
function ResumeEditorChipField({ path, label, placeholder }: { path: ResumeFieldPath; label: string; placeholder?: string }) {
  const id = useId()
  const { state, actions } = useResumeEditor()
  const names = (getIn(state.draft, path) as { name: string }[]).map((item) => item.name)

  return (
    <Field>
      <FieldLabel htmlFor={id} className="sr-only">
        {label}
      </FieldLabel>
      <ChipInput
        id={id}
        value={names}
        placeholder={placeholder}
        onChange={(next) => actions.setField(path, next.map((name) => ({ name })))}
      />
    </Field>
  )
}

function ResumeEditorBulletList({ path, label, itemLabel }: { path: ResumeFieldPath; label: string; itemLabel: string }) {
  const { state, actions } = useResumeEditor()
  const bullets = getIn(state.draft, path) as string[]

  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <p className="text-small text-foreground">{label}</p>
      {bullets.map((_, index) => (
        <div key={index} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <ResumeEditorTextArea path={[...path, index]} label={`${itemLabel} ${index + 1}`} hideLabel rows={2} />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}
            onClick={() => actions.removeItem(path, index)}
          >
            <XIcon aria-hidden="true" />
          </Button>
        </div>
      ))}
      <div>
        <ResumeEditorAddEntry path={path} item="">
          Add {itemLabel.toLowerCase()}
        </ResumeEditorAddEntry>
      </div>
    </div>
  )
}

function ResumeEditorEntryList({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="resume-editor-entry-list" className={cn("flex flex-col", className)} {...props} />
}

type ResumeEditorEntryProps = {
  path: ResumeFieldPath
  title: string
  meta?: string
  defaultOpen?: boolean
  children: ReactNode
}

// A collapsed row with an edit button, or the entry's fields once opened. An entry with errors always opens.
function ResumeEditorEntry({ path, title, meta, defaultOpen = false, children }: ResumeEditorEntryProps) {
  const [open, setOpen] = useState(defaultOpen)
  const editor = useResumeEditor()
  const prefix = `${fieldKey(path)}.`
  const hasErrors = Object.keys(editor.meta.errors).some((key) => key.startsWith(prefix))
  const listPath = path.slice(0, -1)
  const index = path.at(-1) as number
  const name = title || "New entry"

  if (open || hasErrors) {
    return (
      <div className="flex flex-col gap-4 border-border-soft py-4 not-first:border-t first:pt-0">
        {children}
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.actions.removeItem(listPath, index)}>
            <XIcon data-icon="inline-start" aria-hidden="true" />
            Remove
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-12 items-center gap-3 border-border-soft not-first:border-t">
      <p className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="truncate text-ui-strong">{name}</span>
        {meta ? <span className="truncate text-ui text-muted-foreground">{meta}</span> : null}
      </p>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${name}`} onClick={() => setOpen(true)}>
        <PencilSimpleIcon aria-hidden="true" />
      </Button>
    </div>
  )
}

function ResumeEditorAddEntry({ path, item, children }: { path: ResumeFieldPath; item: unknown; children: ReactNode }) {
  const { actions } = useResumeEditor()

  return (
    <Button type="button" variant="ghost" size="sm" onClick={() => actions.addItem(path, item)}>
      <PlusIcon data-icon="inline-start" aria-hidden="true" />
      {children}
    </Button>
  )
}

// Wraps the editor in a form, so Enter in a field and the submit button both save.
function ResumeEditorForm({ className, ...props }: Omit<React.ComponentProps<"form">, "onSubmit">) {
  const { actions } = useResumeEditor()

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void actions.save()
      }}
      className={cn("flex flex-col", className)}
      {...props}
    />
  )
}

function ResumeEditorSubmit(props: Omit<React.ComponentProps<typeof Button>, "type" | "loading">) {
  const { meta } = useResumeEditor()
  return <Button type="submit" variant="primary" size="lg" loading={meta.saving} {...props} />
}

export {
  ResumeEditorProvider,
  ResumeEditorForm,
  ResumeEditorSubmit,
  ResumeEditorField,
  ResumeEditorTextArea,
  ResumeEditorChipField,
  ResumeEditorBulletList,
  ResumeEditorEntryList,
  ResumeEditorEntry,
  ResumeEditorAddEntry,
}

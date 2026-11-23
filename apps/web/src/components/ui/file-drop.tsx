import { useRef, useState, type DragEvent } from "react"
import { FileDocIcon } from "@phosphor-icons/react/dist/csr/FileDoc"
import { FilePdfIcon } from "@phosphor-icons/react/dist/csr/FilePdf"
import { UploadSimpleIcon } from "@phosphor-icons/react/dist/csr/UploadSimple"
import { XIcon } from "@phosphor-icons/react/dist/csr/X"
import { Button } from "@/components/ui/button"
import { formatFileSize } from "@/lib/format-file-size"
import { cn } from "@/lib/utils"

type FileDropProps = Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
  file: File | null
  onFileChange: (file: File | null) => void
  title?: string
  hint?: string
  invalid?: boolean
}

// Empty: a dashed drop area. Selected: the file as a card with Replace and remove. Invalid: a rose border.
function FileDrop({
  file,
  onFileChange,
  title = "Drop your resume here or browse",
  hint,
  invalid,
  className,
  ...props
}: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const showFile = file && !invalid
  const FileIcon = file?.name.toLowerCase().endsWith(".docx") ? FileDocIcon : FilePdfIcon

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    const dropped = event.dataTransfer.files[0]
    if (dropped) onFileChange(dropped)
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      className="sr-only"
      aria-invalid={invalid || undefined}
      onChange={(event) => {
        const chosen = event.target.files?.[0]
        // Clear the input so choosing the same file again still fires a change.
        event.target.value = ""
        if (chosen) onFileChange(chosen)
      }}
      {...props}
    />
  )

  if (showFile) {
    return (
      <div
        data-slot="file-drop"
        className={cn("flex items-center gap-3 rounded-lg bg-card py-2.5 pr-2 pl-2.5 ring-1 ring-border", className)}
      >
        {input}
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <FileIcon className="size-4.5" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-ui-strong wrap-anywhere">{file.name}</span>
          <span className="text-label text-muted-foreground">{formatFileSize(file.size)}</span>
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
          Replace
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove file" onClick={() => onFileChange(null)}>
          <XIcon aria-hidden="true" />
        </Button>
      </div>
    )
  }

  return (
    <label
      data-slot="file-drop"
      data-invalid={invalid || undefined}
      data-dragging={dragging || undefined}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "flex min-h-30 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-strong bg-card/60 p-5 text-center transition-colors hover:bg-card has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ring data-dragging:bg-card data-invalid:border-destructive",
        className
      )}
    >
      {input}
      <UploadSimpleIcon className="size-5 text-icon" aria-hidden="true" />
      <span className="text-ui-strong">{title}</span>
      {hint ? <span className="text-label text-muted-foreground">{hint}</span> : null}
    </label>
  )
}

export { FileDrop }

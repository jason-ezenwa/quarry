import * as React from "react"
import { cn } from "@/lib/utils"

type ResumeVariant = "sheet" | "editor"

// In the editor, the header, summary and each section sit on their own card.
const EDITOR_CARD =
  "group-data-[variant=editor]/resume:rounded-lg group-data-[variant=editor]/resume:bg-card group-data-[variant=editor]/resume:p-4 group-data-[variant=editor]/resume:ring-1 group-data-[variant=editor]/resume:ring-border sm:group-data-[variant=editor]/resume:px-5 sm:group-data-[variant=editor]/resume:pt-4.5 sm:group-data-[variant=editor]/resume:pb-5"

// sheet renders the resume as a printed page; editor lays the same parts out as form sections.
function ResumeRoot({
  className,
  variant,
  ...props
}: React.ComponentProps<"article"> & { variant: ResumeVariant }) {
  return (
    <article
      data-slot="resume"
      data-variant={variant}
      className={cn(
        "group/resume flex w-full flex-col text-foreground",
        "data-[variant=sheet]:max-w-160 data-[variant=sheet]:gap-4.5 data-[variant=sheet]:rounded-xs data-[variant=sheet]:bg-sheet data-[variant=sheet]:px-5.5 data-[variant=sheet]:py-6.5 data-[variant=sheet]:shadow-sheet sm:data-[variant=sheet]:px-13 sm:data-[variant=sheet]:py-12",
        "data-[variant=editor]:gap-4",
        className
      )}
      {...props}
    />
  )
}

function ResumeHeader({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="resume-header"
      className={cn(
        "flex flex-col gap-1.25 group-data-[variant=sheet]/resume:border-b group-data-[variant=sheet]/resume:border-border-soft group-data-[variant=sheet]/resume:pb-4.5",
        "group-data-[variant=editor]/resume:gap-4",
        EDITOR_CARD,
        className
      )}
      {...props}
    />
  )
}

function ResumeName({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 data-slot="resume-name" className={cn("text-headline", className)} {...props} />
}

function ResumeContact({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="resume-contact"
      className={cn(
        "flex flex-wrap gap-x-2 text-small text-muted-foreground [&>*:not(:last-child)]:after:ml-2 [&>*:not(:last-child)]:after:content-['·']",
        className
      )}
      {...props}
    />
  )
}

function ResumeSummary({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="resume-summary"
      className={cn(
        "group-data-[variant=sheet]/resume:text-doc-body",
        "group-data-[variant=editor]/resume:flex group-data-[variant=editor]/resume:flex-col group-data-[variant=editor]/resume:gap-3.5",
        EDITOR_CARD,
        className
      )}
      {...props}
    />
  )
}

function ResumeSection({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="resume-section"
      className={cn(
        "flex flex-col gap-3",
        "group-data-[variant=editor]/resume:gap-3.5",
        EDITOR_CARD,
        className
      )}
      {...props}
    />
  )
}

function ResumeSectionTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="resume-section-title"
      className={cn(
        "group-data-[variant=sheet]/resume:text-doc-caps group-data-[variant=sheet]/resume:text-muted-foreground",
        "group-data-[variant=editor]/resume:text-ui-strong",
        className
      )}
      {...props}
    />
  )
}

function ResumeEntry({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="resume-entry" className={cn("flex flex-col gap-1.25", className)} {...props} />
}

function ResumeEntryHeading({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="resume-entry-heading"
      className={cn("min-w-0 text-ui *:first:text-ui-strong [&>span+span]:text-muted-foreground", className)}
      {...props}
    />
  )
}

function ResumeEntryMeta({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="resume-entry-meta"
      className={cn("shrink-0 text-label text-muted-foreground", className)}
      {...props}
    />
  )
}

function ResumeBullets({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="resume-bullets"
      className={cn("flex list-disc flex-col gap-0.75 pl-4 text-doc-body", className)}
      {...props}
    />
  )
}

function ResumeBullet({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="resume-bullet" className={cn(className)} {...props} />
}

function ResumeSkillList({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="resume-skill-list"
      className={cn("flex flex-wrap text-doc-body [&>li:not(:last-child)]:after:content-[',_']", className)}
      {...props}
    />
  )
}

function ResumeSkill({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="resume-skill" className={cn("whitespace-pre", className)} {...props} />
}

export {
  ResumeRoot,
  ResumeHeader,
  ResumeName,
  ResumeContact,
  ResumeSummary,
  ResumeSection,
  ResumeSectionTitle,
  ResumeEntry,
  ResumeEntryHeading,
  ResumeEntryMeta,
  ResumeBullets,
  ResumeBullet,
  ResumeSkillList,
  ResumeSkill,
}

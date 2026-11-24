import * as React from "react"
import { cn } from "@/lib/utils"
import { EDITOR_CARD } from "./resume.constants"
import type { ResumeVariant } from "./resume.types"

// sheet renders the resume as a printed page, inset as that page inside another sheet;
// editor lays the same parts out as form sections.
function ResumeRoot({
  className,
  variant,
  ...props
}: React.ComponentProps<"article"> & { variant: ResumeVariant }) {
  return (
    <article
      data-slot="resume"
      data-variant={variant}
      // Both read variants share the page's type and rules.
      data-read={variant === "editor" ? undefined : ""}
      className={cn(
        "group/resume flex w-full flex-col text-foreground",
        "data-[variant=sheet]:max-w-160 data-[variant=sheet]:gap-7.5 data-[variant=sheet]:rounded-xs data-[variant=sheet]:bg-sheet data-[variant=sheet]:px-5.5 data-[variant=sheet]:py-6.5 data-[variant=sheet]:shadow-sheet sm:data-[variant=sheet]:px-13 sm:data-[variant=sheet]:py-12",
        "data-[variant=inset]:gap-6",
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
        "flex flex-col gap-1.25 group-data-read/resume:border-b group-data-read/resume:border-border-soft group-data-read/resume:pb-2.5",
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
        "group-data-read/resume:text-doc-body",
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
        "flex flex-col gap-[7.5px]",
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
        // On the sheet the title sits on a hairline, in the same colour as the rule under the name.
        "group-data-read/resume:border-b group-data-read/resume:border-border-soft group-data-read/resume:pb-[3.75px] group-data-read/resume:text-doc-caps group-data-read/resume:text-muted-foreground",
        "group-data-[variant=editor]/resume:text-ui-strong",
        className
      )}
      {...props}
    />
  )
}

function ResumeEntryList({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="resume-entry-list" className={cn("flex flex-col gap-3.75", className)} {...props} />
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
  ResumeEntryList,
  ResumeEntry,
  ResumeEntryHeading,
  ResumeEntryMeta,
  ResumeBullets,
  ResumeBullet,
  ResumeSkillList,
  ResumeSkill,
}

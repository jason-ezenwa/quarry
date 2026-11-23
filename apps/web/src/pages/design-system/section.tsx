import type { ReactNode } from 'react'

export function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 border-b pb-3">
        <h2 className="text-doc-title">{title}</h2>
        {description ? (
          <p className="text-ui text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export function Specimen({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-label text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

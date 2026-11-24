import { FIT_DIMENSIONS, type FitDimension, type FitScoreDocumentResponse, type SessionJob } from '@quarry/contracts'
import { Meter } from '@/components/ui/meter'
import { cn } from '@/lib/utils'
import { jobLine, sourceLabel } from '../session-format'
import { FIT_DIMENSION_NAMES, FIT_LABEL_TEXT } from '../sessions.constants'

const DIMENSIONS = Object.keys(FIT_DIMENSIONS) as FitDimension[]

function Points({ title, items, tone }: { title: string; items: string[]; tone: 'success' | 'warning' }) {
  return (
    <section className="flex min-w-0 flex-col gap-2.5">
      <div className="flex items-center gap-1.75 text-muted-foreground">
        <span aria-hidden="true" className={cn('size-1.5 rounded-full', tone === 'success' ? 'bg-success' : 'bg-warning')} />
        <h3 className="text-doc-caps">{title}</h3>
        <span className="text-label">{items.length}</span>
      </div>
      <ul className="flex flex-col gap-1.75 text-small">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

// The score beside the role, the weighted dimensions, then strengths and gaps side by side.
export function FitReport({ report, job }: { report: FitScoreDocumentResponse; job: SessionJob }) {
  return (
    <article aria-label={`Fit report: ${report.name}`} className="flex flex-col gap-6.5 text-foreground">
      <header className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="text-doc-title">{report.role}</h2>
          <p className="text-small text-muted-foreground">{jobLine([report.company, job.location, sourceLabel(job.source)])}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-score text-fit">{report.overall}%</span>
          <span className="text-small text-muted-foreground">{FIT_LABEL_TEXT[report.label]}</span>
        </div>
      </header>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th scope="col" className="pb-1.5 text-label">
              Score
            </th>
            <th scope="col" className="w-10 pb-1.5 pl-3 text-label">
              Weight
            </th>
            <th scope="col" className="w-17 pb-1.5 pl-3 md:w-30.5">
              <span className="sr-only">Bar</span>
            </th>
            <th scope="col" className="w-9 pb-1.5 pl-3">
              <span className="sr-only">Out of 100</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {DIMENSIONS.map((key) => {
            const { score, detail } = report.dimensions[key]
            return (
              <tr key={key} className="border-t border-border">
                <th scope="row" className="py-2.25 text-left">
                  <span className="block text-small-strong text-foreground">{FIT_DIMENSION_NAMES[key]}</span>
                  <span className="block text-caption text-muted-foreground">{detail}</span>
                </th>
                <td className="pl-3 text-label text-muted-foreground">{FIT_DIMENSIONS[key]}%</td>
                <td className="pl-3">
                  <Meter track="line" min={0} max={100} value={score} aria-label={`${FIT_DIMENSION_NAMES[key]} score`} />
                </td>
                <td className="pl-3 text-right text-label text-foreground">{score}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="grid grid-cols-2 gap-6 border-t border-border pt-4">
        <Points title="Strengths" items={report.strengths} tone="success" />
        <Points title="Gaps" items={report.gaps} tone="warning" />
      </div>
    </article>
  )
}

import { cn } from '@/lib/utils'
import { Section, Specimen } from './section.tsx'

const palettes = [
  {
    name: 'Surfaces, back to front',
    steps: [
      { name: 'plaster', swatch: 'bg-(--plaster)' },
      { name: 'panel', swatch: 'bg-(--panel)' },
      { name: 'paper', swatch: 'bg-(--paper)' },
      { name: 'page', swatch: 'bg-(--page)' },
    ],
  },
  {
    name: 'Lines and ink',
    steps: [
      { name: 'line-soft', swatch: 'bg-(--line-soft)' },
      { name: 'line', swatch: 'bg-(--line)' },
      { name: 'line-strong', swatch: 'bg-(--line-strong)' },
      { name: 'ink-faint', swatch: 'bg-(--ink-faint)' },
      { name: 'ink-muted', swatch: 'bg-(--ink-muted)' },
      { name: 'ink', swatch: 'bg-(--ink)' },
    ],
  },
  {
    name: 'Action, fit and status',
    steps: [
      { name: 'chocolate', swatch: 'bg-(--chocolate)' },
      { name: 'chocolate-hover', swatch: 'bg-(--chocolate-hover)' },
      { name: 'moss', swatch: 'bg-(--moss)' },
      { name: 'matcha', swatch: 'bg-(--matcha)' },
      { name: 'lilac-deep', swatch: 'bg-(--lilac-deep)' },
      { name: 'ochre-dark', swatch: 'bg-(--ochre-dark)' },
    ],
  },
  {
    name: 'Signals',
    steps: [
      { name: 'leaf', swatch: 'bg-(--leaf)' },
      { name: 'leaf-soft', swatch: 'bg-(--leaf-soft)' },
      { name: 'leaf-ink', swatch: 'bg-(--leaf-ink)' },
      { name: 'amber', swatch: 'bg-(--amber)' },
      { name: 'amber-soft', swatch: 'bg-(--amber-soft)' },
      { name: 'amber-ink', swatch: 'bg-(--amber-ink)' },
      { name: 'rose', swatch: 'bg-(--rose)' },
      { name: 'rose-soft', swatch: 'bg-(--rose-soft)' },
      { name: 'rose-ink', swatch: 'bg-(--rose-ink)' },
    ],
  },
]

const semanticTokens = [
  { name: 'background', swatch: 'bg-background text-foreground' },
  { name: 'panel', swatch: 'bg-panel text-foreground' },
  { name: 'card', swatch: 'bg-card text-card-foreground' },
  { name: 'sheet', swatch: 'bg-sheet text-foreground' },
  { name: 'muted', swatch: 'bg-muted text-muted-foreground' },
  { name: 'accent', swatch: 'bg-accent text-accent-foreground' },
  { name: 'primary', swatch: 'bg-primary text-primary-foreground' },
  { name: 'primary-hover', swatch: 'bg-primary-hover text-primary-foreground' },
  { name: 'secondary', swatch: 'bg-secondary text-secondary-foreground' },
  { name: 'fit', swatch: 'bg-fit text-fit-foreground' },
  { name: 'fit-tint', swatch: 'bg-fit-tint text-foreground' },
  { name: 'beta', swatch: 'bg-beta text-beta-foreground' },
  { name: 'beta-tint', swatch: 'bg-beta-tint text-beta' },
  { name: 'highlight', swatch: 'bg-highlight text-primary-foreground' },
  { name: 'status-ready', swatch: 'bg-status-ready text-status-ready-foreground' },
  { name: 'status-interview', swatch: 'bg-status-interview text-status-interview-foreground' },
  { name: 'status-drafting', swatch: 'bg-status-drafting text-status-drafting-foreground' },
  { name: 'success-tint', swatch: 'bg-success-tint text-success-ink' },
  { name: 'warning-tint', swatch: 'bg-warning-tint text-warning-ink' },
  { name: 'destructive-tint', swatch: 'bg-destructive-tint text-destructive-ink' },
  { name: 'border', swatch: 'bg-border text-foreground' },
  { name: 'border-strong', swatch: 'bg-border-strong text-foreground' },
  { name: 'ring', swatch: 'bg-ring text-primary-foreground' },
]

const signals = [
  { name: 'success', dot: 'bg-success' },
  { name: 'warning', dot: 'bg-warning' },
  { name: 'destructive', dot: 'bg-destructive' },
]

export function ColorSection() {
  return (
    <Section
      title="Colour"
      description="The palette sits under semantic tokens. Components and screens only use the semantic layer."
    >
      <div className="flex flex-col gap-6">
        {palettes.map((palette) => (
          <Specimen key={palette.name} label={palette.name}>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {palette.steps.map((step) => (
                <div key={step.name} className="flex flex-col gap-1">
                  <div className={cn('h-field rounded-md border', step.swatch)} />
                  <p className="text-label text-muted-foreground">{step.name}</p>
                </div>
              ))}
            </div>
          </Specimen>
        ))}
        <Specimen label="Semantic tokens">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {semanticTokens.map((token) => (
              <div
                key={token.name}
                className={cn('flex h-16 items-end rounded-lg border p-2 text-label', token.swatch)}
              >
                {token.name}
              </div>
            ))}
          </div>
        </Specimen>
        <Specimen label="Signals only ever appear as small dots, checks and underlines">
          <div className="flex flex-wrap gap-4">
            {signals.map((signal) => (
              <span key={signal.name} className="flex items-center gap-2 text-small">
                <span className={cn('size-1.5 rounded-full', signal.dot)} />
                {signal.name}
              </span>
            ))}
          </div>
        </Specimen>
      </div>
    </Section>
  )
}

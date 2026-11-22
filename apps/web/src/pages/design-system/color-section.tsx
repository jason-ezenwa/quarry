import { cn } from '@/lib/utils'
import { Section, Specimen } from './section.tsx'

const palettes = [
  {
    name: 'Stone',
    steps: [
      { name: '50', swatch: 'bg-(--stone-50)' },
      { name: '100', swatch: 'bg-(--stone-100)' },
      { name: '200', swatch: 'bg-(--stone-200)' },
      { name: '300', swatch: 'bg-(--stone-300)' },
      { name: '400', swatch: 'bg-(--stone-400)' },
      { name: '500', swatch: 'bg-(--stone-500)' },
      { name: '600', swatch: 'bg-(--stone-600)' },
      { name: '700', swatch: 'bg-(--stone-700)' },
      { name: '800', swatch: 'bg-(--stone-800)' },
      { name: '900', swatch: 'bg-(--stone-900)' },
    ],
  },
  {
    name: 'Rust',
    steps: [
      { name: '50', swatch: 'bg-(--rust-50)' },
      { name: '100', swatch: 'bg-(--rust-100)' },
      { name: '200', swatch: 'bg-(--rust-200)' },
      { name: '500', swatch: 'bg-(--rust-500)' },
      { name: '600', swatch: 'bg-(--rust-600)' },
      { name: '700', swatch: 'bg-(--rust-700)' },
      { name: '900', swatch: 'bg-(--rust-900)' },
    ],
  },
  {
    name: 'Status',
    steps: [
      { name: 'slate-50', swatch: 'bg-(--slate-50)' },
      { name: 'slate-600', swatch: 'bg-(--slate-600)' },
      { name: 'moss-50', swatch: 'bg-(--moss-50)' },
      { name: 'moss-600', swatch: 'bg-(--moss-600)' },
      { name: 'red-50', swatch: 'bg-(--red-50)' },
      { name: 'red-600', swatch: 'bg-(--red-600)' },
    ],
  },
]

const semanticTokens = [
  { name: 'background', swatch: 'bg-background text-foreground' },
  { name: 'foreground', swatch: 'bg-foreground text-background' },
  { name: 'card', swatch: 'bg-card text-card-foreground' },
  { name: 'muted', swatch: 'bg-muted text-muted-foreground' },
  { name: 'accent', swatch: 'bg-accent text-accent-foreground' },
  { name: 'primary', swatch: 'bg-primary text-primary-foreground' },
  { name: 'primary-hover', swatch: 'bg-primary-hover text-primary-foreground' },
  { name: 'primary-active', swatch: 'bg-primary-active text-primary-foreground' },
  { name: 'primary-tint', swatch: 'bg-primary-tint text-primary-tint-foreground' },
  { name: 'secondary', swatch: 'bg-secondary text-secondary-foreground' },
  { name: 'destructive', swatch: 'bg-destructive text-destructive-foreground' },
  { name: 'destructive-tint', swatch: 'bg-destructive-tint text-destructive' },
  { name: 'success-tint', swatch: 'bg-success-tint text-success' },
  { name: 'info-tint', swatch: 'bg-info-tint text-info' },
  { name: 'border', swatch: 'bg-border text-foreground' },
  { name: 'input', swatch: 'bg-input text-foreground' },
  { name: 'ring', swatch: 'bg-ring text-foreground' },
  { name: 'link', swatch: 'bg-link text-primary-foreground' },
  { name: 'brand', swatch: 'bg-brand text-primary-foreground' },
  { name: 'scrim', swatch: 'bg-scrim text-primary-foreground' },
]

export function ColorSection() {
  return (
    <Section
      title="Colour"
      description="Palette primitives sit under semantic tokens. Components and screens only use the semantic layer."
    >
      <div className="flex flex-col gap-6">
        {palettes.map((palette) => (
          <Specimen key={palette.name} label={palette.name}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {palette.steps.map((step) => (
                <div key={step.name} className="flex flex-col gap-1">
                  <div className={cn('h-control rounded-lg border', step.swatch)} />
                  <p className="text-caption text-muted-foreground">{step.name}</p>
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
                className={cn('flex h-16 items-end rounded-lg border p-2 text-caption', token.swatch)}
              >
                {token.name}
              </div>
            ))}
          </div>
        </Specimen>
      </div>
    </Section>
  )
}

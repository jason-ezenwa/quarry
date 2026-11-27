import { Section, Specimen } from './section.tsx'

const roles = [
  { role: 'text-title', spec: '26 / 32 · 600 · -2% · single-action screens', sample: 'New application' },
  { role: 'text-question', spec: '16 / 23 · 500', sample: 'Tell me about a system you designed end to end.' },
  { role: 'text-reading', spec: '15 / 24', sample: 'You line up well. Go is the main gap.' },
  { role: 'text-reading-strong', spec: '15 / 24 · 500', sample: 'Tell me about a system you designed.' },
  { role: 'text-ui', spec: '14 / 20', sample: 'Senior backend engineer' },
  { role: 'text-ui-strong', spec: '14 / 20 · 500', sample: 'Fit report' },
  { role: 'text-small', spec: '13 / 18', sample: 'Applications' },
  { role: 'text-small-strong', spec: '13 / 18 · 500', sample: 'Requirements' },
  { role: 'text-caption', spec: '12 / 16', sample: '5 of 7 requirements met' },
  { role: 'text-tab', spec: '12.5 / 18', sample: 'Fit report' },
  { role: 'text-tile', spec: '14 / 20 · 600 · -2%', sample: '86' },
  { role: 'text-label', spec: '11.5 / 16 · mono', sample: '22 Nov · v3' },
  { role: 'text-pill', spec: '11 / 20 · mono', sample: 'Ready' },
  { role: 'text-wordmark', spec: '15 / 20 · 600 · -1%', sample: 'Quarry' },
  { role: 'text-field', spec: '16 / 22 on phones, 15 / 24 from md', sample: 'Paste a job link' },
  { role: 'text-doc-title', spec: '17 / 22 · 600 · -1% · documents and output panels', sample: 'Senior Product Engineer' },
  { role: 'text-doc-body', spec: '13 / 19', sample: 'I build backend systems that stay boring under load.' },
  { role: 'text-doc-caps', spec: '11 / 14 · 600 · 6% · caps', sample: 'Experience' },
]

export function TypeSection() {
  return (
    <Section
      title="Type"
      description="Ezenwa Grotesk for everything, Geist Mono for labels. Each role sets size, line height and weight together."
    >
      <div className="flex flex-col gap-4">
        {roles.map((item) => (
          <Specimen key={item.role} label={`${item.role} · ${item.spec}`}>
            <p className={item.role}>{item.sample}</p>
          </Specimen>
        ))}
      </div>
    </Section>
  )
}

import { Section, Specimen } from './section.tsx'

const roles = [
  { role: 'text-wordmark', spec: '20 · extrabold · -4%', sample: 'quarry' },
  { role: 'text-h1', spec: '28 / 36 · bold · -2%', sample: 'Account settings' },
  { role: 'text-title', spec: '18 / 24 · semibold', sample: 'Welcome back' },
  { role: 'text-lead', spec: '16 / 24', sample: 'Sign up with your email and a password.' },
  { role: 'text-body', spec: '14 / 20', sample: 'The default for running text and controls.' },
  { role: 'text-label', spec: '14 / 20 · semibold', sample: 'Email address' },
  { role: 'text-caption', spec: '12 / 16', sample: 'Last updated 2 minutes ago' },
  { role: 'text-field', spec: '16 below md, 14 from md', sample: 'ada@example.com' },
]

export function TypeSection() {
  return (
    <Section
      title="Type"
      description="Manrope. Each role sets size and line height together. Use the roles, not text-sm and friends."
    >
      <div className="flex flex-col gap-4">
        {roles.map((item) => (
          <Specimen key={item.role} label={`${item.role} · ${item.spec}`}>
            <p className={item.role}>{item.sample}</p>
          </Specimen>
        ))}
        <Specimen label="Weights">
          <p className="text-lead">
            <span className="font-normal">Regular 400 </span>
            <span className="font-medium">Medium 500 </span>
            <span className="font-semibold">Semibold 600 </span>
            <span className="font-bold">Bold 700 </span>
            <span className="font-extrabold">Extrabold 800</span>
          </p>
        </Specimen>
      </div>
    </Section>
  )
}

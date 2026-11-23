import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Section, Specimen } from './section.tsx'

const variants = ['primary', 'secondary', 'ghost', 'destructive', 'link'] as const
const sizes = ['sm', 'default', 'lg'] as const
const iconSizes = ['icon-sm', 'icon', 'icon-lg'] as const

export function ButtonSection() {
  return (
    <Section
      title="Button"
      description="Primary appears at most once per view. Everything else is secondary or ghost."
    >
      <div className="flex flex-col gap-6">
        {variants.map((variant) => (
          <Specimen key={variant} label={`variant="${variant}"`}>
            <div className="flex flex-wrap items-center gap-3">
              {sizes.map((size) => (
                <Button key={size} variant={variant} size={size}>
                  Button {size}
                </Button>
              ))}
              <Button variant={variant} disabled>
                Disabled
              </Button>
            </div>
          </Specimen>
        ))}
        <Specimen label="Icon sizes">
          <div className="flex flex-wrap items-center gap-3">
            {iconSizes.map((size) => (
              <Button key={size} size={size} aria-label={`Add (${size})`}>
                <PlusIcon />
              </Button>
            ))}
          </div>
        </Specimen>
        <Specimen label="With icon and loading">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">
              <PlusIcon data-icon="inline-start" />
              New application
            </Button>
            <Button variant="primary" disabled>
              <Spinner className="text-current" />
              Saving
            </Button>
          </div>
        </Specimen>
      </div>
    </Section>
  )
}

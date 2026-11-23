import { ArrowRightIcon } from '@phosphor-icons/react/dist/csr/ArrowRight'
import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/csr/DownloadSimple'
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus'
import { Button } from '@/components/ui/button'
import { Section, Specimen } from './section.tsx'

const variants = ['primary', 'secondary', 'ghost', 'destructive', 'link'] as const
const sizes = ['sm', 'default', 'lg'] as const
const iconSizes = ['icon-sm', 'icon', 'icon-lg'] as const

export function ButtonSection() {
  return (
    <Section
      title="Button"
      description="Primary appears at most once per view and never has an icon. Secondary and ghost lead with an icon that names the action. Navigation always ends with a trailing arrow."
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
        <Specimen label="Icons: primary none, secondary and ghost leading, navigation trailing">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Start</Button>
            <Button>
              <PlusIcon data-icon="inline-start" />
              New application
            </Button>
            <Button variant="ghost">
              <DownloadSimpleIcon data-icon="inline-start" />
              PDF
            </Button>
            <Button variant="ghost">
              All applications
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </Specimen>
        <Specimen label="Loading">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" loading>
              Saving
            </Button>
            <Button loading>
              <DownloadSimpleIcon data-icon="inline-start" />
              PDF
            </Button>
          </div>
        </Specimen>
      </div>
    </Section>
  )
}

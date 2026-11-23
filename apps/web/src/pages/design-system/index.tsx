import { Wordmark } from '@/components/brand/wordmark'
import { ButtonSection } from './button-section.tsx'
import { ColorSection } from './color-section.tsx'
import { FeedbackSection } from './feedback-section.tsx'
import { FormSection } from './form-section.tsx'
import { NavigationSection } from './navigation-section.tsx'
import { SurfaceSection } from './surface-section.tsx'
import { TypeSection } from './type-section.tsx'

// The reference for every token and primitive. A new primitive or variant is
// added here in every state before a screen uses it.
export function Component() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-8 sm:px-6 lg:py-12">
      <header className="flex flex-col items-start gap-3">
        <Wordmark />
        <h1 className="text-title">Design system</h1>
        <p className="text-ui text-muted-foreground">
          Every token and primitive, in every state. Build screens from these as they are.
        </p>
      </header>
      <ColorSection />
      <TypeSection />
      <ButtonSection />
      <FormSection />
      <FeedbackSection />
      <SurfaceSection />
      <NavigationSection />
    </main>
  )
}

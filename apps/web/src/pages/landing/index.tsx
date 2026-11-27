import { LandingBetaBand } from '@/features/landing/components/landing-beta-band'
import { LandingFooter } from '@/features/landing/components/landing-footer'
import { LandingHeader } from '@/features/landing/components/landing-header'
import { LandingHero } from '@/features/landing/components/landing-hero'
import { LandingShowcase } from '@/features/landing/components/landing-showcase'
import { useRedirectSignedIn } from '@/features/landing/hooks/use-redirect-signed-in'

export function LandingPage() {
  useRedirectSignedIn()

  return (
    <main className="flex min-h-svh flex-col items-center overflow-x-clip">
      <LandingHeader />
      <LandingHero />
      <LandingShowcase />
      <LandingBetaBand />
      <LandingFooter />
    </main>
  )
}

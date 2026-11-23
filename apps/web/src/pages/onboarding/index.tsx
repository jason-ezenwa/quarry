import type { OnboardingAnswers, ProfileResponse } from '@quarry/contracts'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Wordmark } from '@/components/brand/wordmark'
import { PATHS } from '@/lib/auth/auth.constants'
import { cn } from '@/lib/utils'
import { OnboardingForm } from '@/features/onboarding/components/onboarding-form'
import { OnboardingWelcome } from '@/features/onboarding/components/onboarding-welcome'

export function OnboardingPage() {
  const navigate = useNavigate()
  const [answers, setAnswers] = useState<OnboardingAnswers | null>(null)

  function onSaved(profile: ProfileResponse) {
    setAnswers(profile)
  }

  function onAlreadyOnboarded() {
    navigate(PATHS.home, { replace: true })
  }

  return (
    <main
      className={cn(
        'flex min-h-svh flex-col items-center sm:px-6 sm:pt-6 sm:pb-16',
        // On phones the form sits on the panel; the welcome keeps the plaster ground.
        !answers && 'bg-panel sm:bg-transparent',
      )}
    >
      <div className="flex h-14 items-center self-stretch px-5 sm:h-auto sm:px-2">
        <Wordmark />
      </div>
      {answers ? (
        <OnboardingWelcome answers={answers} />
      ) : (
        <div className="flex w-full flex-1 justify-center sm:mt-12 sm:flex-none">
          <OnboardingForm onSaved={onSaved} onAlreadyOnboarded={onAlreadyOnboarded} />
        </div>
      )}
    </main>
  )
}

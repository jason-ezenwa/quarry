import { AccountDetails } from '@/features/profile/components/account-details'
import { OnboardingAnswers } from '@/features/profile/components/onboarding-answers'
import { ResumeStatus } from '@/features/profile/components/resume-status'

export function ProfilePage() {
  return (
    <main className="mx-auto flex w-full max-w-180 flex-col gap-4 px-4 py-8 sm:px-6">
      <h1 className="text-title">Profile</h1>
      <AccountDetails />
      <ResumeStatus />
      <OnboardingAnswers />
    </main>
  )
}

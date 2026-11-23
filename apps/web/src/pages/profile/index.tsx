import { PageHeader } from '@/components/app-frame/page-header'
import { AccountDetails } from '@/features/profile/components/account-details'
import { OnboardingAnswers } from '@/features/profile/components/onboarding-answers'
import { ResumeStatus } from '@/features/profile/components/resume-status'

export function ProfilePage() {
  return (
    <>
      <PageHeader title="Profile" />
      <div className="flex justify-center px-3 pt-1 pb-4 md:px-6 md:pt-8 md:pb-12">
        <div className="flex w-full max-w-180 flex-col gap-3 md:gap-4">
          <AccountDetails />
          <ResumeStatus />
          <OnboardingAnswers />
        </div>
      </div>
    </>
  )
}

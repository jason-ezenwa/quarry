import { PageHeader } from '@/components/app-frame/page-header'
import { NewApplicationForm } from '@/features/sessions/components/new-application-form'
import { RecentApplications } from '@/features/sessions/components/recent-applications'
import { useUsage } from '@/features/sessions/hooks/use-sessions'
import { ReviewResumeCallout } from '@/features/primary-resume/components/review-resume-callout'

// Starts a new application, and lists the latest ones with this month's count.
export function HomePage() {
  const { data: usage } = useUsage()
  const usageLabel = usage ? `${usage.sessions.used} of ${usage.sessions.limit} this month` : undefined

  return (
    <>
      <PageHeader title="Home" />
      <div className="flex flex-1 justify-center px-5 pt-9 pb-12 md:px-6 md:pt-24">
        <div className="flex w-full max-w-170 flex-col gap-10 md:gap-14">
          <ReviewResumeCallout />
          <NewApplicationForm usageLabel={usageLabel} />
          <RecentApplications usageLabel={usageLabel} />
        </div>
      </div>
    </>
  )
}

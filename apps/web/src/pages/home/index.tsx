import { PageHeader } from '@/components/app-frame/page-header'
import { ReviewResumeCallout } from '@/features/primary-resume/components/review-resume-callout'

// Empty until applications arrive, apart from the reminder to review the resume.
export function HomePage() {
  return (
    <>
      <PageHeader title="Home" />
      <div className="flex flex-1 justify-center px-4 pt-5 pb-12 md:px-6 md:pt-18">
        <div className="w-full max-w-170">
          <ReviewResumeCallout />
        </div>
      </div>
    </>
  )
}

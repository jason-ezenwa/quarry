import { PageHeader } from '@/components/app-frame/page-header'
import { InterviewList } from '@/features/sessions/interviews/components/interview-list'

// Interviews only end, so there is no Archived tab.
export function InterviewsPage() {
  return (
    <>
      <PageHeader title="Interviews" />
      <div className="flex flex-1 justify-center px-4 pt-5 pb-12 md:px-6 md:pt-12">
        <div className="w-full max-w-170">
          <InterviewList />
        </div>
      </div>
    </>
  )
}

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { ResumeContent, ResumePageBody, ResumePageHeader } from '@/features/primary-resume/components/resume-content'
import { usePrimaryResume } from '@/features/primary-resume/hooks/use-primary-resume'

export function ResumePage() {
  const { data, isPending, isError } = usePrimaryResume()

  if (isPending || isError) {
    return (
      <>
        <ResumePageHeader />
        <ResumePageBody>
          {isPending ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <Alert variant="destructive">
              <AlertDescription>We couldn't load your resume. Refresh to try again.</AlertDescription>
            </Alert>
          )}
        </ResumePageBody>
      </>
    )
  }

  // Remounts on a new parse, so an edit left open never carries over to a different file.
  return <ResumeContent key={data.parsedAt ?? data.id} data={data} />
}

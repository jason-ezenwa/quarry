import type { PrimaryResumeResponse, Resume } from '@quarry/contracts'
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple'
import { type ReactNode, useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/app-frame/page-header'
import { ResumeEditorSubmit } from '@/components/resume/resume-editor'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PATHS } from '@/lib/auth/auth.constants'
import { PrimaryResume } from '@/features/primary-resume/components/primary-resume'
import { PrimaryResumeEditor } from '@/features/primary-resume/components/primary-resume-editor'
import { ReuploadButton } from '@/features/primary-resume/components/reupload-button'
import { FailedResumeCallout, ReadingResumeCallout } from '@/features/primary-resume/components/resume-state-callouts'
import { ResumeReviewBanner } from '@/features/primary-resume/components/resume-review-banner'
import { usePrimaryResume, useSavePrimaryResume } from '@/features/primary-resume/use-primary-resume'

const CRUMBS = [{ label: 'Profile', to: PATHS.profile }]

function ResumeHeader({ actions }: { actions?: ReactNode }) {
  return <PageHeader title="Resume" crumbs={CRUMBS} actions={actions} />
}

function ResumeBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-center px-4 pt-4 pb-8 sm:px-6 md:pt-10 md:pb-14">
      <div className="flex w-full max-w-180 flex-col gap-4">{children}</div>
    </div>
  )
}

function ResumeContent({ data }: { data: PrimaryResumeResponse }) {
  const [editing, setEditing] = useState(false)
  const save = useSavePrimaryResume()

  if (data.parseStatus === 'parsing') {
    return (
      <>
        <ResumeHeader />
        <ResumeBody>
          <ReadingResumeCallout fileName={data.file.originalName} />
        </ResumeBody>
      </>
    )
  }

  if (data.parseStatus === 'failed' || !data.resume) {
    return (
      <>
        <ResumeHeader />
        <ResumeBody>
          <FailedResumeCallout />
        </ResumeBody>
      </>
    )
  }

  const resume = data.resume
  const reviewing = !data.reviewedAt

  if (reviewing || editing) {
    async function onSave(edited: Resume) {
      await save.mutateAsync(edited)
      setEditing(false)
      toast.success(reviewing ? 'Resume confirmed' : 'Changes saved')
    }

    return (
      <>
        <ResumeHeader />
        <ResumeBody>
          <PrimaryResumeEditor
            resume={resume}
            onSave={onSave}
            actions={
              reviewing ? (
                <>
                  <ReuploadButton />
                  <ResumeEditorSubmit className="ml-auto">Confirm resume</ResumeEditorSubmit>
                </>
              ) : (
                <>
                  <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <ResumeEditorSubmit className="ml-auto">Save changes</ResumeEditorSubmit>
                </>
              )
            }
          >
            {reviewing ? <ResumeReviewBanner fileName={data.file.originalName} /> : null}
          </PrimaryResumeEditor>
        </ResumeBody>
      </>
    )
  }

  return (
    <>
      <ResumeHeader
        actions={
          <>
            <ReuploadButton />
            <Button onClick={() => setEditing(true)}>
              <PencilSimpleIcon data-icon="inline-start" aria-hidden="true" />
              Edit
            </Button>
          </>
        }
      />
      <div className="flex justify-center px-4 pt-4 pb-8 sm:px-6 md:pt-10 md:pb-14">
        <PrimaryResume resume={resume} />
      </div>
    </>
  )
}

export function ResumePage() {
  const { data, isPending, isError } = usePrimaryResume()

  if (isPending || isError) {
    return (
      <>
        <ResumeHeader />
        <ResumeBody>
          {isPending ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <Alert variant="destructive">
              <AlertDescription>We couldn't load your resume. Refresh to try again.</AlertDescription>
            </Alert>
          )}
        </ResumeBody>
      </>
    )
  }

  // Remounts on a new parse, so an edit left open never carries over to a different file.
  return <ResumeContent key={data.parsedAt ?? data.id} data={data} />
}

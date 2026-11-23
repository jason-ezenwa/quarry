import type { PrimaryResumeResponse, Resume } from '@quarry/contracts'
import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight'
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
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

function ResumeContent({ data }: { data: PrimaryResumeResponse }) {
  const [editing, setEditing] = useState(false)
  const save = useSavePrimaryResume()

  if (data.parseStatus === 'parsing') return <ReadingResumeCallout fileName={data.file.originalName} />
  if (data.parseStatus === 'failed' || !data.resume) return <FailedResumeCallout />

  const resume = data.resume
  const reviewing = !data.reviewedAt

  if (reviewing || editing) {
    async function onSave(edited: Resume) {
      await save.mutateAsync(edited)
      setEditing(false)
      toast.success(reviewing ? 'Resume confirmed' : 'Changes saved')
    }

    return (
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
    )
  }

  return (
    <>
      <div className="flex justify-end gap-1.5">
        <ReuploadButton />
        <Button onClick={() => setEditing(true)}>
          <PencilSimpleIcon data-icon="inline-start" aria-hidden="true" />
          Edit
        </Button>
      </div>
      <div className="flex justify-center">
        <PrimaryResume resume={resume} />
      </div>
    </>
  )
}

export function ResumePage() {
  const { data, isPending, isError } = usePrimaryResume()

  return (
    <main className="mx-auto flex w-full max-w-180 flex-col gap-4 px-4 pt-8 pb-8 sm:px-6">
      <div className="flex flex-col gap-1">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-small text-muted-foreground">
          <Link to={PATHS.profile} className="hover:text-foreground">
            Profile
          </Link>
          <CaretRightIcon className="size-3 text-icon" aria-hidden="true" />
        </nav>
        <h1 className="text-title">Resume</h1>
      </div>
      {isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : isError ? (
        <Alert variant="destructive">
          <AlertDescription>We couldn't load your resume. Refresh to try again.</AlertDescription>
        </Alert>
      ) : (
        // Remounts on a new parse, so an edit left open never carries over to a different file.
        <ResumeContent key={data.parsedAt ?? data.id} data={data} />
      )}
    </main>
  )
}

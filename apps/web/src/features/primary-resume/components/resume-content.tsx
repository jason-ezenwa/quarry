import type { PrimaryResumeResponse, Resume } from '@quarry/contracts'
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple'
import { type ReactNode, useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/app-frame/page-header'
import { ResumeDocument } from '@/components/resume/resume-document'
import { ResumeEditorSubmit } from '@/components/resume/resume-editor'
import { Button } from '@/components/ui/button'
import { RESUME_PAGE_CRUMBS } from '../primary-resume.constants'
import { PrimaryResumeEditor } from './primary-resume-editor'
import { ReuploadButton } from './reupload-button'
import { FailedResumeCallout, ReadingResumeCallout } from './resume-state-callouts'
import { ResumeReviewBanner } from './resume-review-banner'
import { useSavePrimaryResume } from '../hooks/use-primary-resume'

export function ResumePageHeader({ actions }: { actions?: ReactNode }) {
  return <PageHeader title="Resume" crumbs={RESUME_PAGE_CRUMBS} actions={actions} />
}

export function ResumePageBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-center px-4 pt-4 pb-8 sm:px-6 md:pt-10 md:pb-14">
      <div className="flex w-full max-w-180 flex-col gap-4">{children}</div>
    </div>
  )
}

export function ResumeContent({ data }: { data: PrimaryResumeResponse }) {
  const [editing, setEditing] = useState(false)
  const save = useSavePrimaryResume()

  if (data.parseStatus === 'parsing') {
    return (
      <>
        <ResumePageHeader />
        <ResumePageBody>
          <ReadingResumeCallout fileName={data.file.originalName} />
        </ResumePageBody>
      </>
    )
  }

  if (data.parseStatus === 'failed' || !data.resume) {
    return (
      <>
        <ResumePageHeader />
        <ResumePageBody>
          <FailedResumeCallout />
        </ResumePageBody>
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
        <ResumePageHeader />
        <ResumePageBody>
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
        </ResumePageBody>
      </>
    )
  }

  return (
    <>
      <ResumePageHeader
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
        <ResumeDocument resume={resume} aria-label="Your resume" />
      </div>
    </>
  )
}

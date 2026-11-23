import { FILE_EXTENSIONS, type PrimaryResumeResponse } from '@quarry/contracts'
import { ArrowRightIcon } from '@phosphor-icons/react/dist/csr/ArrowRight'
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle'
import { FileDocIcon } from '@phosphor-icons/react/dist/csr/FileDoc'
import { FilePdfIcon } from '@phosphor-icons/react/dist/csr/FilePdf'
import { Link } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Callout, CalloutActions, CalloutContent, CalloutTitle } from '@/components/ui/callout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PATHS } from '@/lib/auth/auth.constants'
import { formatFileSize } from '@/lib/format-file-size'
import { ReuploadButton } from '@/features/primary-resume/components/reupload-button'
import { FailedResumeCallout, ReadingResumeCallout } from '@/features/primary-resume/components/resume-state-callouts'
import { formatDay } from '@/features/primary-resume/resume-format'
import { usePrimaryResume } from '@/features/primary-resume/use-primary-resume'

function ResumeFile({ file }: { file: PrimaryResumeResponse['file'] }) {
  const Icon = FILE_EXTENSIONS[file.mimeType] === 'pdf' ? FilePdfIcon : FileDocIcon

  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-ui-strong">{file.originalName}</span>
        <span className="text-label text-muted-foreground">
          {`${FILE_EXTENSIONS[file.mimeType].toUpperCase()}  ·  ${formatFileSize(file.size)}`}
        </span>
      </div>
    </div>
  )
}

function ResumeState({ resume }: { resume: PrimaryResumeResponse }) {
  if (resume.parseStatus === 'parsing') return <ReadingResumeCallout />
  if (resume.parseStatus === 'failed') return <FailedResumeCallout />

  if (!resume.reviewedAt) {
    return (
      <Callout tone="review">
        <CalloutContent>
          <CalloutTitle>Check what we read from your resume</CalloutTitle>
        </CalloutContent>
        <CalloutActions>
          <Button asChild variant="primary" size="sm">
            <Link to={PATHS.resume}>Review resume</Link>
          </Button>
        </CalloutActions>
      </Callout>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border-soft pt-3">
      <span className="flex items-center gap-1.5 text-fit">
        <CheckCircleIcon weight="fill" className="size-3.5" aria-hidden="true" />
        <span className="text-label text-muted-foreground">Confirmed {formatDay(resume.reviewedAt)}</span>
      </span>
      <span className="ml-auto flex gap-1">
        <ReuploadButton size="sm" />
        <Button asChild variant="ghost" size="sm">
          <Link to={PATHS.resume}>
            View resume
            <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
      </span>
    </div>
  )
}

// The resume's state on the Profile page, with whatever the user can do about it.
export function ResumeStatus() {
  const { data: resume, isPending, isError } = usePrimaryResume()

  return (
    <Card size="sm" role="region" aria-label="Resume">
      <CardHeader>
        <CardTitle>Resume</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3.5">
        {isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : isError ? (
          <Alert variant="destructive">
            <AlertDescription>We couldn't load your resume. Refresh to try again.</AlertDescription>
          </Alert>
        ) : (
          <>
            <ResumeFile file={resume.file} />
            <ResumeState resume={resume} />
          </>
        )}
      </CardContent>
    </Card>
  )
}

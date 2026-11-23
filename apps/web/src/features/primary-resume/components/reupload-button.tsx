import { UploadSimpleIcon } from '@phosphor-icons/react/dist/csr/UploadSimple'
import { useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/api-fetch'
import { resumeFileSchema } from '@/lib/profile/onboarding-schema'
import { HTTP_BAD_REQUEST, HTTP_CONFLICT, HTTP_PAYLOAD_TOO_LARGE, RESUME_ERRORS } from '@/lib/profile/profile.constants'
import { RESUME_FILE_ACCEPT, REUPLOAD_ERRORS } from '../primary-resume.constants'
import { useReplacePrimaryResumeFile } from '../hooks/use-primary-resume'

function uploadErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return REUPLOAD_ERRORS.failed
  if (error.status === HTTP_PAYLOAD_TOO_LARGE) return RESUME_ERRORS.tooLarge
  if (error.status === HTTP_BAD_REQUEST) return RESUME_ERRORS.wrongType
  if (error.status === HTTP_CONFLICT) return REUPLOAD_ERRORS.stillReading
  return REUPLOAD_ERRORS.failed
}

// Picks a new resume file, checks it, uploads it and sends the resume back to being read.
export function ReuploadButton({ size = 'default' }: { size?: 'default' | 'sm' }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const replaceFile = useReplacePrimaryResumeFile()

  function onFileChosen(chosen: File) {
    const result = resumeFileSchema.safeParse(chosen)

    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? RESUME_ERRORS.wrongType)
      return
    }

    replaceFile.mutate(result.data, { onError: (error) => toast.error(uploadErrorMessage(error)) })
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={RESUME_FILE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-label="New resume file"
        onChange={(event) => {
          const chosen = event.target.files?.[0]
          event.target.value = ''
          if (chosen) onFileChosen(chosen)
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size={size}
        loading={replaceFile.isPending}
        onClick={() => inputRef.current?.click()}
      >
        <UploadSimpleIcon data-icon="inline-start" aria-hidden="true" />
        Re-upload
      </Button>
    </>
  )
}

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/api-fetch'
import { useOpenInterview } from '../hooks/use-open-interview'
import { INTERVIEWS_ICON } from '../interviews.constants'

// `available`: not archived and has a job description. The server can still turn it off.
export function MockInterviewButton({ applicationId, available }: { applicationId: string; available: boolean }) {
  const { open, pending } = useOpenInterview(applicationId)
  const [noJobDescription, setNoJobDescription] = useState(false)

  function start() {
    open({
      onError: (error, message) => {
        if (error instanceof ApiError && error.code === 'job-description-missing') setNoJobDescription(true)
        toast.error(message)
      },
    })
  }

  return (
    <Button aria-label="Mock interview" disabled={!available || noJobDescription} loading={pending} onClick={start}>
      <INTERVIEWS_ICON data-icon="inline-start" aria-hidden="true" />
      <span className="hidden md:inline">Mock interview</span>
    </Button>
  )
}

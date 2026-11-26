import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { OutputPanelContent, OutputPanelMessage, OutputPanelTab } from '@/components/session/output-panel'
import { interviewPath } from '@/lib/auth/auth.constants'
import { useApplicationInterviews } from '../../hooks/use-sessions'
import { formatShortDate } from '../../session-format'
import { INTERVIEW_STATUS_DISPLAY, INTERVIEWS_ICON, INTERVIEWS_TAB } from '../interviews.constants'

// For the panel beside the chat.
export function InterviewsTab() {
  return (
    <OutputPanelTab value={INTERVIEWS_TAB}>
      <INTERVIEWS_ICON aria-hidden="true" />
      Interviews
    </OutputPanelTab>
  )
}

// No icon, for the full-width tabs on phones.
export function InterviewsTabPlain() {
  return <OutputPanelTab value={INTERVIEWS_TAB}>Interviews</OutputPanelTab>
}

// Fetched when the tab opens.
function ApplicationInterviewList({ applicationId }: { applicationId: string }) {
  const { data: interviews, isError } = useApplicationInterviews(applicationId)

  if (isError) return <OutputPanelMessage className="px-1 pt-2">We couldn't load the interviews.</OutputPanelMessage>
  if (!interviews) return <Spinner aria-label="Loading interviews" className="mx-auto mt-6" />
  if (interviews.length === 0) return <OutputPanelMessage className="px-1 pt-2">Start a mock interview and it shows here.</OutputPanelMessage>

  return (
    <ul className="overflow-hidden rounded-lg border border-border-soft bg-card">
      {interviews.map((interview) => {
        const { label, variant } = INTERVIEW_STATUS_DISPLAY[interview.endedAt ? 'finished' : 'live']

        return (
          <li key={interview.id} className="border-t border-border-soft first:border-t-0">
            <Link to={interviewPath(interview.id)} className="flex min-h-11.5 items-center gap-3 px-3 hover:bg-accent">
              <span className="min-w-0 flex-1 truncate text-ui-strong">{interview.title}</span>
              <Badge variant={variant}>{label}</Badge>
              <span className="text-label text-muted-foreground">{formatShortDate(interview.createdAt)}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function InterviewsTabContent({ applicationId }: { applicationId: string }) {
  return (
    <OutputPanelContent value={INTERVIEWS_TAB}>
      <ApplicationInterviewList applicationId={applicationId} />
    </OutputPanelContent>
  )
}

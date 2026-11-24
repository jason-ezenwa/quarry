import { FileTextIcon } from '@phosphor-icons/react/dist/csr/FileText'
import { LinkSimpleIcon } from '@phosphor-icons/react/dist/csr/LinkSimple'
import { SESSION_LIMITS, type CreateSessionRequest, type MonthlySessionLimitError } from '@quarry/contracts'
import { useId, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Textarea } from '@/components/ui/textarea'
import { MEDIUM_SCREEN_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { ApiError } from '@/lib/api/api-fetch'
import { PATHS, sessionPath } from '@/lib/auth/auth.constants'
import { useCreateSession } from '../hooks/use-sessions'
import { formatResetDate } from '../session-format'

type Mode = 'link' | 'paste'

const FORM_ERRORS = {
  link: 'Paste a job link that starts with http:// or https://',
  paste: 'Paste the job description',
  tooLong: `Keep the description under ${SESSION_LIMITS.jobDescriptionMaxLength.toLocaleString('en')} characters`,
  failed: "We couldn't start this application. Try again.",
} as const

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

function requestFor(mode: Mode, value: string): CreateSessionRequest | string {
  const trimmed = value.trim()
  if (mode === 'link') return isHttpUrl(trimmed) ? { jobUrl: trimmed } : FORM_ERRORS.link
  if (!trimmed) return FORM_ERRORS.paste
  if (trimmed.length > SESSION_LIMITS.jobDescriptionMaxLength) return FORM_ERRORS.tooLong
  return { jobDescription: trimmed }
}

function SubmitError({ error }: { error: unknown }) {
  if (error instanceof ApiError && error.code === 'monthly-session-limit') {
    const body: Partial<Record<keyof MonthlySessionLimitError, unknown>> = error.body ?? {}
    const limit = typeof body.limit === 'number' ? body.limit : SESSION_LIMITS.sessionsPerMonth
    const resetsAt = typeof body.resetsAt === 'string' ? body.resetsAt : null

    return (
      <p role="alert" className="text-small text-destructive-ink">
        You've used all {limit} applications this month.
        {resetsAt ? ` More on ${formatResetDate(resetsAt)}.` : null}
      </p>
    )
  }

  if (error instanceof ApiError && error.code === 'primary-resume-not-ready') {
    return (
      <p role="alert" className="text-small text-destructive-ink">
        Your resume isn't ready yet: it's still being read, or it couldn't be read.{' '}
        <Link to={PATHS.resume} className="underline underline-offset-3">
          Check your resume
        </Link>
      </p>
    )
  }

  return (
    <p role="alert" className="text-small text-destructive-ink">
      {FORM_ERRORS.failed}
    </p>
  )
}

// Starts a session from a job link, or from a pasted description, and opens it.
export function NewApplicationForm({ usageLabel }: { usageLabel?: string }) {
  const navigate = useNavigate()
  const createSession = useCreateSession()

  const [mode, setMode] = useState<Mode>('link')
  const [value, setValue] = useState('')
  const [invalid, setInvalid] = useState<string | null>(null)

  const startInField = useMediaQuery(MEDIUM_SCREEN_QUERY)

  function switchMode(next: Mode) {
    setMode(next)
    setValue('')
    setInvalid(null)
    createSession.reset()
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const request = requestFor(mode, value)

    if (typeof request === 'string') {
      setInvalid(request)
      return
    }

    setInvalid(null)
    createSession.mutate(request, { onSuccess: ({ id }) => navigate(sessionPath(id)) })
  }

  const errorId = useId()

  const start = (
    <Button type="submit" variant="primary" size="lg" loading={createSession.isPending}>
      Start
    </Button>
  )

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 md:gap-5">
      <h2 className="text-title">New application</h2>
      {mode === 'link' ? (
        <div className="flex flex-col gap-4">
          <InputGroup size="lg">
            <InputGroupAddon>
              <LinkSimpleIcon aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              type="url"
              inputMode="url"
              aria-label="Job link"
              placeholder="Paste a job link"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              aria-invalid={invalid ? true : undefined}
              aria-describedby={invalid ? errorId : undefined}
            />
            {startInField ? start : null}
          </InputGroup>
          {startInField ? null : <div className="flex [&>button]:w-full">{start}</div>}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Textarea
            aria-label="Job description"
            placeholder="Paste the job description"
            rows={8}
            className="max-h-96 min-h-40"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-invalid={invalid ? true : undefined}
            aria-describedby={invalid ? errorId : undefined}
          />
          <div className="flex justify-end [&>button]:w-full md:[&>button]:w-auto">{start}</div>
        </div>
      )}
      {invalid ? (
        <p id={errorId} role="alert" className="text-small text-destructive-ink">
          {invalid}
        </p>
      ) : null}
      {createSession.isError ? <SubmitError error={createSession.error} /> : null}
      <div className="flex items-center justify-between gap-3">
        {mode === 'link' ? (
          <Button type="button" variant="ghost" onClick={() => switchMode('paste')}>
            <FileTextIcon data-icon="inline-start" aria-hidden="true" />
            Paste a description instead
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={() => switchMode('link')}>
            <LinkSimpleIcon data-icon="inline-start" aria-hidden="true" />
            Use a job link instead
          </Button>
        )}
        {usageLabel ? <span className="text-label text-muted-foreground md:hidden">{usageLabel}</span> : null}
      </div>
    </form>
  )
}

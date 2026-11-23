import type { PrimaryResumeResponse, Resume, UploadedFileRef } from '@quarry/contracts'
import { queryOptions } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api/api-fetch'
import { PARSE_POLL_INTERVAL_MS } from './primary-resume.constants'

export const primaryResumeQueryOptions = queryOptions({
  queryKey: ['resumes', 'primary'] as const,
  queryFn: () => apiFetch<PrimaryResumeResponse>('/api/resumes/primary'),
  // Keeps asking while the resume is being read, so every view moves on by itself once it lands.
  refetchInterval: (query) => (query.state.data?.parseStatus === 'parsing' ? PARSE_POLL_INTERVAL_MS : false),
})

export function savePrimaryResume(resume: Resume): Promise<PrimaryResumeResponse> {
  return apiFetch<PrimaryResumeResponse>('/api/resumes/primary', { method: 'PUT', body: JSON.stringify(resume) })
}

export function retryPrimaryResumeParse(): Promise<void> {
  return apiFetch<void>('/api/resumes/primary/parse', { method: 'POST' })
}

export async function replacePrimaryResumeFile(file: File): Promise<PrimaryResumeResponse> {
  const body = new FormData()
  body.append('purpose', 'primary-resume')
  body.append('file', file)
  const uploaded = await apiFetch<UploadedFileRef>('/api/resumes/uploads', { method: 'POST', body })
  return apiFetch<PrimaryResumeResponse>('/api/resumes/primary/file', { method: 'PUT', body: JSON.stringify(uploaded) })
}

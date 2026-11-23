import type { CreateProfileRequest, ProfileResponse, UploadedFileRef } from '@quarry/contracts'
import { queryOptions } from '@tanstack/react-query'
import { ApiError, apiFetch } from '@/lib/api/api-fetch'

// null means the user hasn't finished onboarding.
async function fetchProfile(): Promise<ProfileResponse | null> {
  try {
    return await apiFetch<ProfileResponse>('/api/profiles/me')
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export const profileQueryOptions = queryOptions({
  queryKey: ['profiles', 'me'] as const,
  queryFn: fetchProfile,
  // The profile gate must always ask the server, whatever the app-wide default.
  staleTime: 0,
})

export function uploadPrimaryResume(file: File): Promise<UploadedFileRef> {
  const body = new FormData()
  body.append('purpose', 'primary-resume')
  body.append('file', file)
  return apiFetch<UploadedFileRef>('/api/profiles/uploads', { method: 'POST', body })
}

export function createProfile(request: CreateProfileRequest): Promise<ProfileResponse> {
  return apiFetch<ProfileResponse>('/api/profiles', { method: 'POST', body: JSON.stringify(request) })
}

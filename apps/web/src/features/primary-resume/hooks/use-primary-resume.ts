import type { PrimaryResumeResponse, Resume } from '@quarry/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  primaryResumeQueryOptions,
  replacePrimaryResumeFile,
  retryPrimaryResumeParse,
  savePrimaryResume,
} from '../primary-resume-api'

export function usePrimaryResume() {
  return useQuery(primaryResumeQueryOptions)
}

// Cancels any refetch in flight first, so an older answer can't land over the one just saved.
function useSetPrimaryResume() {
  const queryClient = useQueryClient()

  return async (response: PrimaryResumeResponse) => {
    await queryClient.cancelQueries({ queryKey: primaryResumeQueryOptions.queryKey })
    queryClient.setQueryData(primaryResumeQueryOptions.queryKey, response)
  }
}

// After a refused retry or re-upload (a parse already running), ask again so the page shows the real state.
function useRefreshPrimaryResume() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: primaryResumeQueryOptions.queryKey })
}

export function useSavePrimaryResume() {
  const setPrimaryResume = useSetPrimaryResume()

  return useMutation({
    mutationFn: (resume: Resume) => savePrimaryResume(resume),
    onSuccess: setPrimaryResume,
  })
}

export function useReplacePrimaryResumeFile() {
  const setPrimaryResume = useSetPrimaryResume()
  const refresh = useRefreshPrimaryResume()

  return useMutation({
    mutationFn: (file: File) => replacePrimaryResumeFile(file),
    onSuccess: setPrimaryResume,
    onError: refresh,
  })
}

export function useRetryPrimaryResumeParse() {
  const refresh = useRefreshPrimaryResume()

  return useMutation({
    mutationFn: retryPrimaryResumeParse,
    // The retry answers with no body, so either way ask again for the resume.
    onSettled: refresh,
  })
}

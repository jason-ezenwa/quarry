import type { PrimaryResumeResponse, Resume } from '@quarry/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  primaryResumeQueryOptions,
  replacePrimaryResumeFile,
  retryPrimaryResumeParse,
  savePrimaryResume,
} from './primary-resume-api'

export function usePrimaryResume() {
  return useQuery(primaryResumeQueryOptions)
}

function useSetPrimaryResume() {
  const queryClient = useQueryClient()
  return (response: PrimaryResumeResponse) => queryClient.setQueryData(primaryResumeQueryOptions.queryKey, response)
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
  return useMutation({
    mutationFn: (file: File) => replacePrimaryResumeFile(file),
    onSuccess: setPrimaryResume,
  })
}

export function useRetryPrimaryResumeParse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: retryPrimaryResumeParse,
    // The retry answers with no body, so ask again for the resume, now back to parsing.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: primaryResumeQueryOptions.queryKey }),
  })
}

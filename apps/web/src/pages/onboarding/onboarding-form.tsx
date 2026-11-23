import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/api-fetch'
import {
  onboardingSchema,
  RESUME_ERRORS,
  type OnboardingFormValues,
  type OnboardingSubmission,
} from '@/lib/profile/onboarding-schema'
import { createProfile, uploadPrimaryResume } from '@/lib/profile/profile-api'
import type { ProfileResponse, UploadedFileRef } from '@quarry/contracts'
import {
  CountryField,
  ExperienceField,
  ResumeUploadField,
  SalaryFloorField,
  TargetRolesField,
  WorkSetupField,
} from './onboarding-fields'
import { defaultLocation } from './onboarding-options'

const HTTP_BAD_REQUEST = 400
const HTTP_CONFLICT = 409
const HTTP_PAYLOAD_TOO_LARGE = 413

type OnboardingFormProps = {
  onSaved: (profile: ProfileResponse) => void
  onAlreadyOnboarded: () => void
}

export function OnboardingForm({ onSaved, onAlreadyOnboarded }: OnboardingFormProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const [location] = useState(() => defaultLocation(navigator.language))
  const form = useForm<OnboardingFormValues, unknown, OnboardingSubmission>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      resume: null,
      targetRoles: [],
      yearsOfExperience: '',
      workSetups: [],
      salaryAmount: '',
      ...location,
    },
  })

  async function onSubmit({ resume, ...answers }: OnboardingSubmission) {
    setFormError(null)

    let uploaded: UploadedFileRef
    try {
      uploaded = await uploadPrimaryResume(resume)
    } catch (error) {
      if (error instanceof ApiError && error.status === HTTP_PAYLOAD_TOO_LARGE) {
        form.setError('resume', { message: RESUME_ERRORS.tooLarge })
      } else if (error instanceof ApiError && error.status === HTTP_BAD_REQUEST) {
        form.setError('resume', { message: RESUME_ERRORS.wrongType })
      } else {
        setFormError('We could not upload your resume. Try again.')
      }
      return
    }

    try {
      onSaved(await createProfile({ ...answers, resume: uploaded }))
    } catch (error) {
      if (error instanceof ApiError && error.status === HTTP_CONFLICT) {
        onAlreadyOnboarded()
        return
      }
      setFormError('We could not save your profile. Try again.')
    }
  }

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full flex-col sm:block sm:max-w-220 sm:overflow-hidden sm:rounded-lg sm:border sm:border-border sm:bg-panel sm:shadow-panel"
      >
        <div className="px-5 pt-3 sm:px-10 sm:pt-8 sm:pb-2">
          <h1 className="text-title">Set up your profile</h1>
        </div>
        <div className="px-5 sm:px-10 sm:py-2">
          {formError ? (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <ResumeUploadField />
          <TargetRolesField />
          <ExperienceField />
          <CountryField />
          <WorkSetupField />
          <SalaryFloorField />
        </div>
        <div className="mt-auto flex justify-end border-t border-border-soft px-4 pt-3 pb-5 sm:px-10 sm:py-4">
          <Button type="submit" variant="primary" size="lg" loading={form.formState.isSubmitting} className="w-full sm:w-auto">
            Save and continue
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}

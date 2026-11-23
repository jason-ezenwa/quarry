import { COUNTRIES, TARGET_ROLES_LIMITS } from '@quarry/contracts'
import type { ChangeEvent, ReactNode } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { ChipInput } from '@/components/ui/chip-input'
import { ChoiceChips } from '@/components/ui/choice-chips'
import { FieldError } from '@/components/ui/field'
import { FileDrop } from '@/components/ui/file-drop'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { RESUME_MAX_MB } from '@/lib/profile/profile.constants'
import type { OnboardingFormValues } from '@/lib/profile/profile.types'
import { COUNTRY_OPTIONS, CURRENCY_OPTIONS, isCountryCode, WORK_SETUP_OPTIONS } from './onboarding-options'

type FormRowProps = {
  label: string
  labelId: string
  htmlFor?: string
  hint?: string
  error?: string
  children: ReactNode
}

// A question: its label on the left (above on phones), the control and its error on the right.
function FormRow({ label, labelId, htmlFor, hint, error, children }: FormRowProps) {
  const LabelTag = htmlFor ? 'label' : 'span'

  return (
    <div className="grid grid-cols-1 gap-2.5 border-t border-border-soft py-5 first:border-t-0 sm:grid-cols-[13.75rem_minmax(0,1fr)] sm:gap-8 sm:py-5.5">
      <div className="flex items-baseline justify-between gap-2 sm:flex-col sm:justify-start sm:gap-1 sm:pt-2.5">
        <LabelTag id={labelId} htmlFor={htmlFor} className="text-ui-strong">
          {label}
        </LabelTag>
        {hint ? <span className="text-label text-muted-foreground">{hint}</span> : null}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        {children}
        <FieldError id={errorId(labelId)}>{error}</FieldError>
      </div>
    </div>
  )
}

function errorId(labelId: string) {
  return `${labelId}-error`
}

function errorProps(labelId: string, error: string | undefined) {
  return { 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? errorId(labelId) : undefined }
}

export function ResumeUploadField() {
  const { control } = useFormContext<OnboardingFormValues>()

  return (
    <Controller
      control={control}
      name="resume"
      render={({ field, fieldState }) => (
        <FormRow label="Resume" labelId="resume-label" htmlFor="resume" error={fieldState.error?.message}>
          <FileDrop
            id="resume"
            name={field.name}
            accept=".pdf,.docx"
            file={field.value}
            onFileChange={field.onChange}
            hint={`PDF or DOCX, up to ${RESUME_MAX_MB} MB`}
            invalid={Boolean(fieldState.error)}
            aria-describedby={errorProps('resume-label', fieldState.error?.message)['aria-describedby']}
          />
        </FormRow>
      )}
    />
  )
}

export function TargetRolesField() {
  const { control } = useFormContext<OnboardingFormValues>()

  return (
    <Controller
      control={control}
      name="targetRoles"
      render={({ field, fieldState }) => (
        <FormRow
          label="Target roles"
          labelId="target-roles-label"
          htmlFor="target-roles"
          hint={`${field.value.length} of ${TARGET_ROLES_LIMITS.maxItems}`}
          error={fieldState.error?.message}
        >
          <ChipInput
            id="target-roles"
            placeholder="Add a role"
            maxLength={TARGET_ROLES_LIMITS.maxLength}
            max={TARGET_ROLES_LIMITS.maxItems}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            {...errorProps('target-roles-label', fieldState.error?.message)}
          />
        </FormRow>
      )}
    />
  )
}

export function ExperienceField() {
  const {
    register,
    formState: { errors },
  } = useFormContext<OnboardingFormValues>()

  const error = errors.yearsOfExperience?.message

  return (
    <FormRow label="Years of experience" labelId="years-label" htmlFor="years" error={error}>
      <Input id="years" inputMode="numeric" className="sm:max-w-40" {...errorProps('years-label', error)} {...register('yearsOfExperience')} />
    </FormRow>
  )
}

export function CountryField() {
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<OnboardingFormValues>()

  const error = errors.countryCode?.message

  const field = register('countryCode', {
    // The salary currency follows the country; it can still be changed after.
    onChange: (event: ChangeEvent<HTMLSelectElement>) => {
      const code = event.target.value
      if (isCountryCode(code)) setValue('currency', COUNTRIES[code].currency)
    },
  })

  return (
    <FormRow label="Country" labelId="country-label" htmlFor="country" error={error}>
      <NativeSelect id="country" className="w-full sm:max-w-80" {...errorProps('country-label', error)} {...field}>
        <NativeSelectOption value="" disabled>
          Choose a country
        </NativeSelectOption>
        {COUNTRY_OPTIONS.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </FormRow>
  )
}

export function WorkSetupField() {
  const { control } = useFormContext<OnboardingFormValues>()

  return (
    <Controller
      control={control}
      name="workSetups"
      render={({ field, fieldState }) => (
        <FormRow label="Work setup" labelId="work-setup-label" error={fieldState.error?.message}>
          <ChoiceChips
            aria-labelledby="work-setup-label"
            aria-describedby={errorProps('work-setup-label', fieldState.error?.message)['aria-describedby']}
            options={WORK_SETUP_OPTIONS}
            value={field.value}
            onChange={field.onChange}
            invalid={Boolean(fieldState.error)}
          />
        </FormRow>
      )}
    />
  )
}

export function SalaryFloorField() {
  const {
    register,
    formState: { errors },
  } = useFormContext<OnboardingFormValues>()

  const error = errors.salaryAmount?.message ?? errors.currency?.message

  return (
    <FormRow label="Salary floor" labelId="salary-label" htmlFor="salary" error={error}>
      <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2 sm:grid-cols-[minmax(0,16.25rem)_7rem]">
        <InputGroup>
          <InputGroupInput
            id="salary"
            inputMode="numeric"
            {...errorProps('salary-label', errors.salaryAmount?.message)}
            {...register('salaryAmount')}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupText>per year</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        <NativeSelect aria-label="Currency" className="w-full" {...errorProps('salary-label', errors.currency?.message)} {...register('currency')}>
          {CURRENCY_OPTIONS.map((currency) => (
            <NativeSelectOption key={currency} value={currency}>
              {currency}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
    </FormRow>
  )
}

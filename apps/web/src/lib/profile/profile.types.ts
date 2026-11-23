import type { z } from 'zod'
import type { onboardingSchema } from './onboarding-schema'

// The form's own values: selects and number fields hold strings until the schema parses them.
export type OnboardingFormValues = z.input<typeof onboardingSchema>

export type OnboardingSubmission = z.output<typeof onboardingSchema>

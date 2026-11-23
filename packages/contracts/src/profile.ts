import type { CountryCode, Currency } from "./countries.js";
import type { UploadedFileRef } from "./uploads.js";

export const WORK_SETUPS = ["remote", "hybrid", "onsite"] as const;
export type WorkSetup = (typeof WORK_SETUPS)[number];

export const TARGET_ROLES_LIMITS = {
  minItems: 1,
  maxItems: 3,
  maxLength: 80,
} as const;

export const YEARS_OF_EXPERIENCE_LIMITS = { min: 0, max: 60 } as const;

// Annual, in the given currency.
export type SalaryFloor = {
  amount: number;
  currency: Currency;
};

export type OnboardingAnswers = {
  targetRoles: string[];
  yearsOfExperience: number;
  countryCode: CountryCode;
  workSetups: WorkSetup[];
  salaryFloor: SalaryFloor;
};

export type CreateProfileRequest = OnboardingAnswers & {
  resume: UploadedFileRef;
};

export type ProfileResponse = OnboardingAnswers & {
  id: string;
  createdAt: string;
};

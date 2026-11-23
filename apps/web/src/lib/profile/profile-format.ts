import { COUNTRIES, type OnboardingAnswers, type WorkSetup } from '@quarry/contracts'

export const WORK_SETUP_LABELS: Record<WorkSetup, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'Onsite',
}

export function formatWorkSetups(workSetups: WorkSetup[]) {
  return workSetups.map((setup) => WORK_SETUP_LABELS[setup]).join(', ')
}

// The bare symbol (₦, $) only for the country's own currency, so CAD never reads as USD.
export function formatSalaryFloor({ salaryFloor, countryCode }: Pick<OnboardingAnswers, 'salaryFloor' | 'countryCode'>) {
  const { amount, currency } = salaryFloor

  const formatted = new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    currencyDisplay: currency === COUNTRIES[countryCode].currency ? 'narrowSymbol' : 'symbol',
    maximumFractionDigits: 0,
  }).format(amount)

  return `${formatted} a year`
}

export function formatYears(years: number) {
  return years === 1 ? '1 year' : `${years} years`
}

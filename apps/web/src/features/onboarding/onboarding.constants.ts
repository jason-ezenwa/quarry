import { COUNTRIES, CURRENCIES, type CountryCode, type Currency, type WorkSetup } from '@quarry/contracts'
import { WORK_SETUP_LABELS } from '@/lib/profile/profile-format'

export const WELCOME_DURATION_MS = 2500

export const WHITESPACE = /\s+/

export const WORK_SETUP_OPTIONS = Object.entries(WORK_SETUP_LABELS).map(([value, label]) => ({
  value: value as WorkSetup,
  label,
}))

export const COUNTRY_OPTIONS = (Object.entries(COUNTRIES) as [CountryCode, { name: string }][])
  .map(([code, { name }]) => ({ value: code, label: name }))
  .sort((a, b) => a.label.localeCompare(b.label))

export const CURRENCY_OPTIONS = CURRENCIES

export const DEFAULT_CURRENCY: Currency = 'USD'

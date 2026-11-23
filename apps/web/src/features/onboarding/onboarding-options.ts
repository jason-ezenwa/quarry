import { COUNTRIES, CURRENCIES, type CountryCode, type Currency, type WorkSetup } from '@quarry/contracts'
import { WORK_SETUP_LABELS } from '@/lib/profile/profile-format'

export const WORK_SETUP_OPTIONS = Object.entries(WORK_SETUP_LABELS).map(([value, label]) => ({
  value: value as WorkSetup,
  label,
}))

export const COUNTRY_OPTIONS = (Object.entries(COUNTRIES) as [CountryCode, { name: string }][])
  .map(([code, { name }]) => ({ value: code, label: name }))
  .sort((a, b) => a.label.localeCompare(b.label))

export const CURRENCY_OPTIONS = CURRENCIES

const DEFAULT_CURRENCY: Currency = 'USD'

export function isCountryCode(value: string | undefined): value is CountryCode {
  return value !== undefined && value in COUNTRIES
}

// Starts the country on the browser's region, so most people don't have to change it.
export function defaultLocation(locale: string): { countryCode: CountryCode | ''; currency: Currency } {
  let region: string | undefined

  try {
    region = new Intl.Locale(locale).maximize().region
  } catch {
    region = undefined
  }

  return isCountryCode(region)
    ? { countryCode: region, currency: COUNTRIES[region].currency }
    : { countryCode: '', currency: DEFAULT_CURRENCY }
}

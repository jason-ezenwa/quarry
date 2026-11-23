import { COUNTRIES, type CountryCode, type Currency } from '@quarry/contracts'
import { DEFAULT_CURRENCY } from './onboarding.constants'

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

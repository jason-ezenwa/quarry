import { COUNTRIES, type OnboardingAnswers } from '@quarry/contracts'
import { BirdIcon } from '@phosphor-icons/react/dist/csr/Bird'
import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Spinner } from '@/components/ui/spinner'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PATHS } from '@/lib/auth/auth.constants'
import { WORK_SETUP_LABELS } from './onboarding-options'

const WELCOME_DURATION_MS = 2500
const WHITESPACE = /\s+/

// The bare symbol (₦, $) only for the country's own currency, so CAD never reads as USD.
function formatSalaryFloor({ amount, currency }: OnboardingAnswers['salaryFloor'], countryCurrency: string) {
  const formatted = new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    currencyDisplay: currency === countryCurrency ? 'narrowSymbol' : 'symbol',
    maximumFractionDigits: 0,
  }).format(amount)
  return `${formatted} a year`
}

function formatYears(years: number) {
  return years === 1 ? '1 year' : `${years} years`
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-label opacity-72">{label}</dt>
      <dd className="text-ui-strong">{value}</dd>
    </div>
  )
}

// Shown after onboarding saves, built from the answers just submitted, then hands over to Home.
export function OnboardingWelcome({ answers }: { answers: OnboardingAnswers }) {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const firstName = user?.name.trim().split(WHITESPACE)[0]

  useEffect(() => {
    const timer = setTimeout(() => navigate(PATHS.home, { replace: true }), WELCOME_DURATION_MS)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-11 px-5 pb-7 sm:gap-14 sm:pb-14">
      <section
        aria-label="Your search"
        className="flex w-full max-w-80 -rotate-2 flex-col gap-6 rounded-[0.875rem] bg-fit px-7 pt-6.5 pb-7 text-fit-foreground shadow-lifted motion-safe:animate-tilt-in sm:max-w-110"
      >
        <div className="flex items-center gap-2.5">
          <BirdIcon weight="fill" className="size-5" aria-hidden="true" />
          <span className="text-wordmark">Your search</span>
        </div>
        <dl className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <dt className="text-label opacity-72">Looking for</dt>
            <dd className="text-headline">{answers.targetRoles.join(', ')}</dd>
          </div>
          <div className="grid grid-cols-2 gap-4.5">
            <Detail label="Setup" value={answers.workSetups.map((setup) => WORK_SETUP_LABELS[setup]).join(', ')} />
            <Detail label="Based in" value={COUNTRIES[answers.countryCode].name} />
            <Detail label="Experience" value={formatYears(answers.yearsOfExperience)} />
            <Detail label="Floor" value={formatSalaryFloor(answers.salaryFloor, COUNTRIES[answers.countryCode].currency)} />
          </div>
        </dl>
      </section>
      <div className="flex flex-col items-center gap-3.5 text-center motion-safe:animate-rise-in">
        <h1 className="text-display">{firstName ? `You're in, ${firstName}.` : "You're in."}</h1>
        <p className="flex items-center gap-2 text-ui text-muted-foreground">
          <Spinner className="size-4.5 text-current" aria-hidden="true" />
          Reading your resume
        </p>
      </div>
    </div>
  )
}

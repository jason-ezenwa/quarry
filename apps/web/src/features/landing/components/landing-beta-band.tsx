import { Button } from '@/components/ui/button'
import { WAITLIST_URL } from '../landing.constants'

export function LandingBetaBand() {
  return (
    <section aria-labelledby="landing-beta" className="mt-12 flex w-full justify-center bg-beta-tint text-beta md:mt-20">
      <div className="flex w-full max-w-300 flex-col gap-6 px-5 pt-9 pb-8 md:flex-row md:flex-wrap md:items-center md:justify-between md:px-6 md:py-14">
        <div className="flex max-w-140 flex-col gap-2.5 md:gap-1.5">
          <h2 id="landing-beta" className="text-section">
            Quarry is in private beta.
          </h2>
          <p className="text-reading">
            We are letting people in a few at a time, job seekers who are applying right now first. Join the list and
            we will email you when there is a seat.
          </p>
        </div>
        <Button asChild variant="beta" size="xl">
          <a href={WAITLIST_URL} target="_blank" rel="noreferrer">
            Join the waitlist
          </a>
        </Button>
      </div>
    </section>
  )
}

import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PATHS } from '@/lib/auth/auth.constants'
import { WAITLIST_URL } from '../landing.constants'

export function LandingHero() {
  return (
    <section
      aria-labelledby="landing-title"
      className="flex w-full max-w-300 flex-col gap-4.5 px-5 pt-10 md:gap-6 md:px-6 md:pt-24"
    >
      <Badge variant="beta">Private beta</Badge>
      <h1 id="landing-title" className="max-w-190 text-hero">
        Apply with an <span className="text-highlight">agent</span> in your corner.
      </h1>
      <div className="flex flex-col gap-6 md:flex-row md:flex-wrap md:items-end md:justify-between md:gap-12">
        <p className="max-w-125 text-lede text-muted-foreground">
          Wren manages and tailors your job applications, then helps you prepare with mock interviews.
        </p>
        <div className="flex flex-col gap-2 md:flex-row md:gap-2.5">
          <Button asChild variant="primary" size="xl">
            <a href={WAITLIST_URL} target="_blank" rel="noreferrer">
              Join the waitlist
            </a>
          </Button>
          <Button asChild variant="secondary" size="xl">
            <Link to={PATHS.signIn}>I have an invite</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

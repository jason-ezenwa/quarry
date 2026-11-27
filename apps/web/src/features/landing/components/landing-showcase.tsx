import { useState } from 'react'
import painting from '@/assets/landing/corot-landscape.webp'
import { PATHS } from '@/lib/auth/auth.constants'
import { cn } from '@/lib/utils'
import { useDemoScale } from '../hooks/use-demo-scale'
import { DEMO_LABEL, PAINTING_CREDIT } from '../landing.constants'

// The real app at its own size in a frame, scaled down onto a painting. Phones show a crop of it.
export function LandingShowcase() {
  const scaleRef = useDemoScale<HTMLDivElement>()
  const [loaded, setLoaded] = useState(false)

  return (
    <section aria-label="Quarry in use" className="flex w-full max-w-300 flex-col gap-2.5 px-3 pt-10 md:gap-3 md:px-6 md:pt-16">
      <div className="relative h-110 overflow-hidden rounded-[16px] bg-foreground md:aspect-[8/5] md:h-auto md:rounded-[20px]">
        <img
          src={painting}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover object-[30%_40%] md:object-[center_40%]"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-foreground/10" />
        <div
          role="img"
          aria-label={DEMO_LABEL}
          className="absolute top-9 left-6 h-110 w-160 overflow-hidden rounded-lg border border-foreground/10 bg-background shadow-lifted md:top-18 md:left-1/2 md:h-auto md:w-[min(1080px,calc(100%-48px))] md:-translate-x-1/2 md:rounded-xl"
        >
          <div ref={scaleRef} className="relative -ml-[70px] aspect-[3/2] w-[691px] md:ml-0 md:w-full">
            <iframe
              src={PATHS.landingDemo}
              title="Quarry demo"
              tabIndex={-1}
              inert
              onLoad={() => setLoaded(true)}
              className={cn(
                'pointer-events-none absolute top-0 left-0 h-[960px] w-[1440px] origin-top-left scale-(--demo-scale) transition-opacity duration-500',
                loaded ? 'opacity-100' : 'opacity-0',
              )}
            />
          </div>
        </div>
      </div>
      <p className="px-2 text-small text-muted-foreground md:px-0">{PAINTING_CREDIT}</p>
    </section>
  )
}

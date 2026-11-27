import appShot from '@/assets/landing/app-shot.webp'
import painting from '@/assets/landing/corot-landscape.webp'
import { APP_SHOT_ALT, PAINTING_CREDIT } from '../landing.constants'

// The app, framed on a landscape painting. Phones show a crop of it; larger screens show it whole, cut at the frame's foot.
export function LandingShowcase() {
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
        <div className="absolute top-9 left-6 h-110 w-160 overflow-hidden rounded-lg border border-foreground/10 bg-background shadow-lifted md:top-18 md:left-1/2 md:h-auto md:w-[min(1080px,calc(100%-48px))] md:-translate-x-1/2 md:rounded-xl">
          <img
            src={appShot}
            alt={APP_SHOT_ALT}
            width={1440}
            height={960}
            fetchPriority="high"
            className="-ml-[70px] w-[691px] max-w-none md:ml-0 md:w-full"
          />
        </div>
      </div>
      <p className="px-2 text-small text-muted-foreground md:px-0">{PAINTING_CREDIT}</p>
    </section>
  )
}

import type { ComponentType, ReactNode, SVGProps } from 'react'
import { NavLink } from 'react-router'

type NavItemProps = {
  to: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  // Match the path exactly, so Home isn't active on every page.
  end?: boolean
  children: ReactNode
}

export function NavItem({ to, icon: IconComponent, end, children }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className="group/nav flex h-control items-center gap-2.25 rounded-md px-2.5 text-small text-muted-foreground hover:bg-accent hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground"
    >
      <IconComponent
        aria-hidden="true"
        className="size-4 shrink-0 text-icon group-aria-[current=page]/nav:text-foreground"
      />
      <span className="truncate">{children}</span>
    </NavLink>
  )
}

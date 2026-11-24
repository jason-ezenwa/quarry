import type { ComponentType, ReactNode, SVGProps } from 'react'

export type NavItemProps = {
  to: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  // Match the path exactly, so Home isn't active on every page.
  end?: boolean
  children: ReactNode
}

export type Crumb = { label: string; to: string }

export type PageHeaderProps = {
  title: string
  // Beside the title on larger screens, under it on phones, such as the company.
  sub?: string
  // A status pill after the title, from md up.
  badge?: ReactNode
  crumbs?: Crumb[]
  actions?: ReactNode
}

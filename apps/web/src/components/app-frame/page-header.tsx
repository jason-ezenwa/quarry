import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight'
import { ListIcon } from '@phosphor-icons/react/dist/csr/List'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { SheetTrigger } from '@/components/ui/sheet'
import type { PageHeaderProps } from './app-frame.types'

// The top of the main panel. On phones it is the top bar: the menu button, a centred title and the actions.
export function PageHeader({ title, crumbs = [], actions }: PageHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-1 px-1.5 md:h-12 md:gap-2.5 md:border-b md:border-border-soft md:px-4">
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-touch" aria-label="Open menu" className="md:hidden">
          <ListIcon aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2 md:justify-start">
        {crumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="hidden items-center gap-2 md:flex">
            {crumbs.map((crumb) => (
              <span key={crumb.to} className="flex items-center gap-2">
                <Link to={crumb.to} className="text-small whitespace-nowrap text-muted-foreground hover:text-foreground">
                  {crumb.label}
                </Link>
                <CaretRightIcon aria-hidden="true" className="size-3 text-icon" />
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="truncate text-ui-strong">{title}</h1>
      </div>
      <div className="flex min-w-11 items-center justify-end gap-1.5 md:min-w-0">{actions}</div>
    </header>
  )
}

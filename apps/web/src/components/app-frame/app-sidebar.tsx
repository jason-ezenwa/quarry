import { HouseIcon } from '@phosphor-icons/react/dist/csr/House'
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus'
import { StackIcon } from '@phosphor-icons/react/dist/csr/Stack'
import { UserCircleIcon } from '@phosphor-icons/react/dist/csr/UserCircle'
import { Link } from 'react-router'
import { Wordmark } from '@/components/brand/wordmark'
import { Button } from '@/components/ui/button'
import { RecentSessions } from '@/features/sessions/applications/components/recent-sessions'
import { UsageMeter } from '@/features/sessions/components/usage-meter'
import { PATHS } from '@/lib/auth/auth.constants'
import { AccountMenu } from './account-menu'
import { NavItem } from './nav-item'
import { SidebarToggle } from './sidebar-toggle'

// The sidebar on larger screens, and the menu sheet on phones. `inSheet`: shown as the phone menu, which has no hide button.
export function AppSidebar({ inSheet = false }: { inSheet?: boolean }) {
  return (
    <div className="flex h-full flex-col gap-4.5 px-2.5 py-3.5">
      <div className="flex h-8 items-center justify-between pl-1.5">
        <Wordmark />
        {inSheet ? null : <SidebarToggle />}
      </div>
      <Button asChild align="start" className="w-full">
        <Link to={PATHS.home}>
          <PlusIcon data-icon="inline-start" aria-hidden="true" />
          New application
        </Link>
      </Button>
      <nav aria-label="Main" className="flex flex-col gap-px">
        <NavItem to={PATHS.home} icon={HouseIcon} end>
          Home
        </NavItem>
        <NavItem to={PATHS.applications} icon={StackIcon}>
          Applications
        </NavItem>
        <NavItem to={PATHS.profile} icon={UserCircleIcon}>
          Profile
        </NavItem>
      </nav>
      <RecentSessions />
      <div className="mt-auto flex flex-col gap-3">
        <UsageMeter />
        <AccountMenu />
      </div>
    </div>
  )
}

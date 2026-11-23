import { HouseIcon } from '@phosphor-icons/react/dist/csr/House'
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus'
import { UserCircleIcon } from '@phosphor-icons/react/dist/csr/UserCircle'
import { Wordmark } from '@/components/brand/wordmark'
import { Button } from '@/components/ui/button'
import { PATHS } from '@/lib/auth/auth.constants'
import { AccountMenu } from './account-menu'
import { NavItem } from './nav-item'

// The sidebar on larger screens, and the menu sheet on phones. onNavigate closes the sheet.
export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-4.5 px-2.5 py-3.5">
      <div className="flex h-8 items-center px-1.5">
        <Wordmark />
      </div>
      {/* Applications come in a later release; the button holds their place. */}
      <Button disabled className="w-full">
        <PlusIcon data-icon="inline-start" aria-hidden="true" />
        New application
      </Button>
      <nav aria-label="Main" className="flex flex-col gap-px">
        <NavItem to={PATHS.home} icon={HouseIcon} end onNavigate={onNavigate}>
          Home
        </NavItem>
        <NavItem to={PATHS.profile} icon={UserCircleIcon} onNavigate={onNavigate}>
          Profile
        </NavItem>
      </nav>
      <div className="mt-auto">
        <AccountMenu />
      </div>
    </div>
  )
}

import { GearIcon } from '@phosphor-icons/react/dist/csr/Gear'
import { SignOutIcon } from '@phosphor-icons/react/dist/csr/SignOut'
import { useNavigate } from 'react-router'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCurrentUser } from '@/hooks/use-current-user'
import { authClient } from '@/lib/auth-client'
import { PATHS } from '@/lib/auth/auth.constants'
import { getInitials } from '@/lib/get-initials'
import { queryClient } from '@/lib/query-client'

// The foot of the sidebar: who is signed in, and the menu that signs them out.
export function AccountMenu() {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()

  async function signOut() {
    await authClient.signOut()
    queryClient.clear()
    navigate(PATHS.signIn)
  }

  return (
    <div className="flex items-center gap-2.25 pr-0.5 pl-1.5">
      <Avatar size="sm" aria-hidden="true">
        <AvatarFallback>{user ? getInitials(user.name) : null}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate text-small">{user?.name}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Account">
            <GearIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end">
          {user ? (
            <>
              <DropdownMenuLabel>
                <span className="truncate text-ui-strong">{user.name}</span>
                <span className="truncate text-small text-muted-foreground">{user.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem onSelect={signOut}>
            <SignOutIcon aria-hidden="true" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

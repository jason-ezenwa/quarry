import { SignOutIcon } from '@phosphor-icons/react/dist/csr/SignOut'
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
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Section, Specimen } from './section.tsx'

export function NavigationSection() {
  return (
    <Section title="Navigation" description="Avatars, the account menu and the phone menu sheet.">
      <div className="flex flex-col gap-6">
        <Specimen label="Avatar sizes">
          <div className="flex items-center gap-3">
            <Avatar size="sm">
              <AvatarFallback>AO</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>AO</AvatarFallback>
            </Avatar>
            <Avatar size="lg">
              <AvatarFallback>AO</AvatarFallback>
            </Avatar>
          </div>
        </Specimen>
        <Specimen label="Dropdown menu and sheet">
          <div className="flex flex-wrap items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>Open menu</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>
                  <span className="text-ui-strong">Ada Obi</span>
                  <span className="text-small text-muted-foreground">ada@example.com</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <SignOutIcon aria-hidden="true" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Sheet>
              <SheetTrigger asChild>
                <Button>Open sheet</Button>
              </SheetTrigger>
              <SheetContent className="gap-1 p-4">
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription>On phones the sidebar opens here.</SheetDescription>
              </SheetContent>
            </Sheet>
          </div>
        </Specimen>
      </div>
    </Section>
  )
}

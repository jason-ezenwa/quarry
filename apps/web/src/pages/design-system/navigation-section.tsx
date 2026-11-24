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
import { Meter } from '@/components/ui/meter'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Section, Specimen } from './section.tsx'

export function NavigationSection() {
  return (
    <Section title="Navigation" description="Avatars, the account menu, the phone menu sheet, tabs and meters.">
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
        <Specimen label="Tabs, and filled across the width as on phones">
          <div className="flex flex-col gap-3">
            <Tabs defaultValue="fit">
              <TabsList aria-label="Outputs">
                <TabsTrigger value="fit">Fit report</TabsTrigger>
                <TabsTrigger value="resume">Resume</TabsTrigger>
                <TabsTrigger value="cover">Cover letter</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs defaultValue="active" className="max-w-sm">
              <TabsList fill aria-label="Applications">
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </Specimen>
        <Specimen label="Meters: soft track (usage), line track (on a sheet)">
          <div className="flex max-w-60 flex-col gap-3">
            <Meter min={0} max={10} value={4} aria-label="Applications used" />
            <Meter track="line" min={0} max={100} value={79} aria-label="Requirements score" />
          </div>
        </Specimen>
      </div>
    </Section>
  )
}

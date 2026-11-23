import { useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { AppSidebar } from '@/components/app-frame/app-sidebar'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'

// The signed-in frame: the sidebar on the plaster ground and the page in a panel beside it.
// On phones the panel fills the screen and the sidebar opens as a sheet from each page's header.
export function AppLayout() {
  const { pathname } = useLocation()
  // The page the menu was opened on. Any navigation, back gesture included, closes it.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null)
  const menuOpen = menuOpenOn === pathname

  return (
    <Sheet open={menuOpen} onOpenChange={(open) => setMenuOpenOn(open ? pathname : null)}>
      <div className="flex min-h-svh bg-panel md:bg-transparent">
        <aside className="sticky top-0 hidden h-svh w-58 shrink-0 md:block">
          <AppSidebar />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col md:py-2 md:pr-2">
          <main className="flex flex-1 flex-col md:overflow-clip md:rounded-lg md:border md:border-border md:bg-panel md:shadow-panel">
            <Outlet />
          </main>
        </div>
      </div>
      <SheetContent aria-describedby={undefined} hideFrom="md" className="bg-background texture-plaster">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <AppSidebar />
      </SheetContent>
    </Sheet>
  )
}

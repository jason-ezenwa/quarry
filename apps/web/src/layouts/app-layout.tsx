import { useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { AppFrameContext } from '@/components/app-frame/app-frame-context'
import type { AppFrameContextValue } from '@/components/app-frame/app-frame.types'
import { AppSidebar } from '@/components/app-frame/app-sidebar'
import { useSidebarOpen } from '@/components/app-frame/use-sidebar-open'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

// The signed-in frame: the sidebar, which can be hidden from md up, beside the page in a panel.
// On phones the panel fills the screen and the sidebar opens as a sheet from each page's header.
export function AppLayout() {
  const { pathname } = useLocation()
  // The page the menu was opened on. Any navigation, back gesture included, closes it.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null)
  const menuOpen = menuOpenOn === pathname
  const [sidebarOpen, setSidebarOpen] = useSidebarOpen()
  const frame: AppFrameContextValue = { state: { sidebarOpen }, actions: { setSidebarOpen } }

  return (
    <AppFrameContext value={frame}>
      <Sheet open={menuOpen} onOpenChange={(open) => setMenuOpenOn(open ? pathname : null)}>
        <div className="flex min-h-svh bg-panel md:bg-transparent">
          {sidebarOpen ? (
            <aside aria-label="Sidebar" className="sticky top-0 hidden h-svh w-58 shrink-0 md:block">
              <AppSidebar />
            </aside>
          ) : null}
          <div className={cn('flex min-w-0 flex-1 flex-col md:py-2 md:pr-2', !sidebarOpen && 'md:pl-2')}>
            <main className="flex flex-1 flex-col md:overflow-clip md:rounded-lg md:border md:border-border md:bg-panel md:shadow-panel">
              <Outlet />
            </main>
          </div>
        </div>
        <SheetContent aria-describedby={undefined} hideFrom="md" className="bg-background texture-plaster">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <AppSidebar inSheet />
        </SheetContent>
      </Sheet>
    </AppFrameContext>
  )
}

import { SidebarSimpleIcon } from '@phosphor-icons/react/dist/csr/SidebarSimple'
import { Button } from '@/components/ui/button'
import { useAppFrame } from './app-frame-context'

// Hides the sidebar from inside it, or shows it again from the page header. Only from md up.
export function SidebarToggle() {
  const { state, actions } = useAppFrame()
  const label = state.sidebarOpen ? 'Hide sidebar' : 'Show sidebar'

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-expanded={state.sidebarOpen}
      className="hidden md:inline-flex"
      onClick={() => actions.setSidebarOpen(!state.sidebarOpen)}
    >
      <SidebarSimpleIcon aria-hidden="true" />
    </Button>
  )
}

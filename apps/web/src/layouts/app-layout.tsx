import { Outlet } from 'react-router'
import { AppHeader } from '@/components/app-header/app-header'

export function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />
      <Outlet />
    </div>
  )
}

import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useI18n } from '@/hooks/useI18n'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const { t } = useI18n()

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          {/* A page that throws while rendering shows a message here, rather
              than unmounting the app and leaving a blank screen. The key
              resets it on navigation, so a broken page never traps the user. */}
          <ErrorBoundary key={pathname} title={t('error.pageCrashed')} retryLabel={t('error.retry')}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

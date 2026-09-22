import { useState } from 'react'
import { BadgeCheck, Gauge, Users } from 'lucide-react'
import UsersPage from './UsersPage'
import SubscriptionsPage from './SubscriptionsPage'
import TenantsPage from './TenantsPage'
import { cn } from '@/lib/cn'
import { useI18n } from '@/hooks/useI18n'

type Tab = 'users' | 'subscriptions' | 'analytics'

/** Admin hub: user management, subscriptions and all-tenant analytics in one page. */
export default function AdminUsersHub() {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('users')

  const tabs = [
    { id: 'users', label: t('admin.tab.users'), icon: Users },
    { id: 'subscriptions', label: t('admin.tab.subscriptions'), icon: BadgeCheck },
    { id: 'analytics', label: t('admin.tab.analytics'), icon: Gauge },
  ] as const

  return (
    <div>
      <div className="mb-6 inline-flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface2 p-1">
        {tabs.map((x) => (
          <button
            key={x.id}
            onClick={() => setTab(x.id)}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
              tab === x.id
                ? 'bg-surface text-fg shadow-sm'
                : 'text-muted hover:text-fg',
            )}
          >
            <x.icon className="size-4" />
            {x.label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersPage />}
      {tab === 'subscriptions' && <SubscriptionsPage />}
      {tab === 'analytics' && <TenantsPage />}
    </div>
  )
}

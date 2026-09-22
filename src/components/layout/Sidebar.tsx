import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'
import { Wordmark } from '@/components/Logo'
import { useAuth } from '@/hooks/useAuth'
import { useI18n } from '@/hooks/useI18n'
import { cn } from '@/lib/cn'
import { navSections } from './nav'

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isAdmin } = useAuth()
  const { t } = useI18n()

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-navy-900/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-40 flex w-64 flex-col border-e border-navy-700/60 bg-navy-800 text-cream-100',
          'transition-transform duration-200 lg:static',
          // Visible by default; only slide off-canvas on mobile when closed.
          open ? 'translate-x-0' : 'max-lg:ltr:-translate-x-full max-lg:rtl:translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Wordmark
            className="[&_.text-fg]:text-cream-50"
            title={t('app.name')}
            subtitle={t('app.subtitle')}
          />
          <button
            onClick={onClose}
            className="rounded-md p-1 text-cream-200 hover:bg-white/10 lg:hidden"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navSections.map((section) => {
            const items = section.items.filter((i) => !i.adminOnly || isAdmin)
            if (items.length === 0) return null
            return (
              <div key={section.titleKey} className="mb-5">
                <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-cream-200/40">
                  {t(section.titleKey)}
                </p>
                <ul className="space-y-0.5">
                  {items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={onClose}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-brand-500 text-navy-900'
                              : 'text-cream-100/80 hover:bg-white/10 hover:text-cream-50',
                          )
                        }
                      >
                        <item.icon className="size-[18px] shrink-0" />
                        {t(item.labelKey)}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-4 text-[11px] text-cream-200/40">
          {t('nav.footer')}
        </div>
      </aside>
    </>
  )
}

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Globe, LogOut, Menu, Moon, Settings, ShieldCheck, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useI18n } from '@/hooks/useI18n'
import { cn } from '@/lib/cn'

function initials(first: string, last: string, username: string): string {
  const a = (first?.[0] ?? '').toUpperCase()
  const b = (last?.[0] ?? '').toUpperCase()
  return a + b || username.slice(0, 2).toUpperCase()
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, isAdmin, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t, lang, setLang } = useI18n()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  if (!user) return null
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-surface2/80 px-4 backdrop-blur lg:px-8">
      <button
        onClick={onMenu}
        className="rounded-lg p-2 text-muted hover:bg-surface2 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-1.5">
        {/* Language switch (en <-> ar) */}
        <button
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface2 hover:text-fg"
          aria-label={t('common.language')}
          title={t('common.language')}
        >
          <Globe className="size-[18px]" />
          <span className="hidden sm:inline">{lang === 'ar' ? 'EN' : 'ع'}</span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-muted transition-colors hover:bg-surface2 hover:text-fg"
          aria-label={t('common.theme.toggle')}
          title={t('common.theme.toggle')}
        >
          {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-lg p-1.5 pe-2 transition-colors hover:bg-surface2"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-navy-900">
              {initials(user.first_name, user.last_name, user.username)}
            </span>
            <span className="hidden text-start sm:block">
              <span className="block text-sm font-medium leading-tight text-fg">{fullName}</span>
              <span className="block text-xs leading-tight text-muted">
                {isAdmin ? t('common.administrator') : t('common.tenant')}
              </span>
            </span>
            <ChevronDown className="size-4 text-muted" />
          </button>

          {open && (
            <div className="absolute end-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg shadow-navy-900/10">
              <div className="px-4 py-3">
                <p className="truncate text-sm font-medium text-fg">{fullName}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
                {isAdmin && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-steel-500/10 px-2 py-0.5 text-[11px] font-medium text-steel-600 dark:text-steel-300">
                    <ShieldCheck className="size-3" /> {t('common.admin')}
                  </span>
                )}
              </div>
              <div className="border-t border-border" />
              <MenuButton
                icon={<Settings className="size-4" />}
                label={t('common.settings')}
                onClick={() => {
                  setOpen(false)
                  navigate('/settings')
                }}
              />
              <MenuButton
                icon={<LogOut className="size-4" />}
                label={t('common.signOut')}
                danger
                onClick={() => {
                  setOpen(false)
                  logout()
                  navigate('/login', { replace: true })
                }}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function MenuButton({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-4 py-2 text-sm transition-colors',
        danger ? 'text-danger hover:bg-danger/5' : 'text-fg hover:bg-surface2',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

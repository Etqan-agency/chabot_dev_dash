import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, type Location } from 'react-router-dom'
import { Globe, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useI18n } from '@/hooks/useI18n'
import { getApiErrorMessage } from '@/lib/api'

export default function LoginPage() {
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t, lang, setLang } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: Location } | null)?.from?.pathname ?? '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, t('login.error')))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-bg lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-800 p-12 text-cream-50 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              'radial-gradient(900px 500px at 80% -10%, rgba(229,162,60,0.22), transparent 60%),' +
              'radial-gradient(700px 500px at 0% 110%, rgba(62,124,177,0.28), transparent 55%)',
          }}
        />
        <div className="relative flex items-center gap-3">
          <Logo className="size-10" />
          <span className="text-lg font-semibold tracking-tight">
            {t('app.name')} {t('app.subtitle')}
          </span>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-semibold leading-tight">
            {t('login.headlinePre')} <span className="text-brand-400">{t('login.headlineEm')}</span>.
          </h1>
          <p className="mt-4 text-cream-200/80">{t('login.tagline')}</p>
        </div>
        <div className="relative flex gap-2 text-xs text-cream-200/60">
          <span className="rounded-full bg-white/10 px-3 py-1">{t('login.tag.multitenant')}</span>
          <span className="rounded-full bg-white/10 px-3 py-1">{t('login.tag.rag')}</span>
          <span className="rounded-full bg-white/10 px-3 py-1">{t('login.tag.whatsapp')}</span>
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex items-center justify-center p-6">
        {/* Theme + language controls */}
        <div className="absolute end-4 top-4 flex items-center gap-1">
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface2 hover:text-fg"
            aria-label={t('common.language')}
          >
            <Globe className="size-[18px]" />
            <span>{lang === 'ar' ? 'EN' : 'ع'}</span>
          </button>
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-surface2 hover:text-fg"
            aria-label={t('common.theme.toggle')}
          >
            {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          </button>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo className="size-10" />
          </div>
          <h2 className="text-2xl font-semibold text-fg">{t('login.title')}</h2>
          <p className="mt-1 text-sm text-muted">{t('login.subtitle')}</p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <Input
              label={t('login.username')}
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
            <Input
              label={t('login.password')}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" loading={submitting} className="mt-2">
              {t('common.signIn')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {t('login.noAccount')}{' '}
            <Link
              to="/register"
              className="font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              {t('login.signUp')}
            </Link>
          </p>
          <p className="mt-2 text-center text-sm">
            <Link to="/home" className="text-muted hover:text-fg hover:underline">
              {t('mk.about.title')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

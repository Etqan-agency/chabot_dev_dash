import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Globe, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/Logo'
import { authApi } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api'
import { useTheme } from '@/hooks/useTheme'
import { useI18n } from '@/hooks/useI18n'

const EMPTY = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  password_confirm: '',
}

export default function RegisterPage() {
  const { theme, toggleTheme } = useTheme()
  const { t, lang, setLang } = useI18n()
  const navigate = useNavigate()

  const [form, setForm] = useState({ ...EMPTY })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ email: string; failed: boolean } | null>(null)

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await authApi.register({
        username: form.username.trim(),
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        password: form.password,
        password_confirm: form.password_confirm,
      })
      setDone({ email: form.email.trim(), failed: res.email_verification === 'send_failed' })
    } catch (err) {
      setError(getApiErrorMessage(err))
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

          {done ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckCircle2 className="size-7" />
              </span>
              <h2 className="text-2xl font-semibold text-fg">{t('register.success.title')}</h2>
              <p className="text-sm text-muted">
                {done.failed
                  ? t('register.success.failed')
                  : t('register.success.desc', { email: done.email })}
              </p>
              <Button className="mt-3 w-full" onClick={() => navigate('/login', { replace: true })}>
                {t('register.signIn')}
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-semibold text-fg">{t('register.title')}</h2>
              <p className="mt-1 text-sm text-muted">{t('register.subtitle')}</p>

              <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
                <Input
                  label={t('admin.users.f.username')}
                  autoComplete="username"
                  value={form.username}
                  onChange={(e) => set('username', e.target.value)}
                  required
                  autoFocus
                />
                <Input
                  label={t('admin.users.f.email')}
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  required
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label={t('admin.users.f.firstName')}
                    value={form.first_name}
                    onChange={(e) => set('first_name', e.target.value)}
                  />
                  <Input
                    label={t('admin.users.f.lastName')}
                    value={form.last_name}
                    onChange={(e) => set('last_name', e.target.value)}
                  />
                </div>
                <Input
                  label={t('admin.users.f.password')}
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  required
                />
                <Input
                  label={t('admin.users.f.passwordConfirm')}
                  type="password"
                  autoComplete="new-password"
                  value={form.password_confirm}
                  onChange={(e) => set('password_confirm', e.target.value)}
                  required
                />

                {error && (
                  <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                    {error}
                  </div>
                )}

                <Button type="submit" size="lg" loading={submitting} className="mt-2">
                  {t('register.submit')}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted">
                {t('register.haveAccount')}{' '}
                <Link to="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                  {t('register.signIn')}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

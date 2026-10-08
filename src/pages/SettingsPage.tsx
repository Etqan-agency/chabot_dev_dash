import { useState, type FormEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  Sparkles,
  User as UserIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { CopyField } from '@/components/ui/CopyField'
import { Spinner } from '@/components/ui/Spinner'
import { usersApi } from '@/lib/endpoints'
import { getApiErrorMessage, getApiErrorStatus } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useI18n } from '@/hooks/useI18n'
import { useMyFeatures } from '@/hooks/useMyFeatures'

export default function SettingsPage() {
  const { t } = useI18n()
  const { user } = useAuth()

  return (
    <div>
      <PageHeader title={t('settings.title')} description={t('settings.subtitle')} />
      {!user ? (
        <div className="flex items-center justify-center py-24">
          <Spinner className="size-7" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ProfileCard />
          <EmailCard />
          <PasswordCard />
          <ApiKeyCard />
        </div>
      )}
    </div>
  )
}

function SavedNote({ show, label }: { show: boolean; label: string }) {
  if (!show) return null
  return (
    <span className="flex items-center gap-1.5 text-sm font-medium text-success">
      <CheckCircle2 className="size-4" /> {label}
    </span>
  )
}

function ErrorNote({ error }: { error: unknown }) {
  return (
    <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
      {getApiErrorMessage(error)}
    </div>
  )
}

function ProfileCard() {
  const { t } = useI18n()
  const { user, refreshUser } = useAuth()
  const [first, setFirst] = useState(user?.first_name ?? '')
  const [last, setLast] = useState(user?.last_name ?? '')
  const [username, setUsername] = useState(user?.username ?? '')

  const save = useMutation({
    mutationFn: () =>
      usersApi.updateMe({ first_name: first.trim(), last_name: last.trim(), username: username.trim() }),
    onSuccess: () => void refreshUser(),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    save.mutate()
  }

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <UserIcon className="size-4 text-muted" /> {t('settings.profile.title')}
          </span>
        }
        description={t('settings.profile.desc')}
      />
      <CardBody>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={t('settings.f.firstName')}
              value={first}
              onChange={(e) => setFirst(e.target.value)}
            />
            <Input
              label={t('settings.f.lastName')}
              value={last}
              onChange={(e) => setLast(e.target.value)}
            />
          </div>
          <Input
            label={t('settings.f.username')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          {save.isError && <ErrorNote error={save.error} />}
          <div className="flex items-center justify-end gap-3">
            <SavedNote show={save.isSuccess} label={t('settings.saved')} />
            <Button type="submit" loading={save.isPending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}

function EmailCard() {
  const { t } = useI18n()
  const { user, refreshUser } = useAuth()
  const verified = user?.email_verified !== false
  const [mode, setMode] = useState<'idle' | 'editing' | 'code'>('idle')
  const [newEmail, setNewEmail] = useState('')
  const [targetEmail, setTargetEmail] = useState('') // where the code was sent
  const [code, setCode] = useState('')
  const [doneMsg, setDoneMsg] = useState<string | null>(null)

  // Step 1: request a code for a given address (new address, or the current one
  // to verify it). Resends re-use the target address.
  const request = useMutation({
    mutationFn: (email: string) => usersApi.changeEmail(email),
    onSuccess: (_data, email) => {
      setTargetEmail(email)
      setMode('code')
    },
  })
  // Step 2: confirm the code.
  const verify = useMutation({
    mutationFn: () => usersApi.verifyEmail(code.trim()),
    onSuccess: () => {
      void refreshUser()
      setDoneMsg(t('settings.email.changed'))
      reset(true)
    },
  })

  function reset(keepDone = false) {
    setMode('idle')
    setNewEmail('')
    setCode('')
    setTargetEmail('')
    request.reset()
    verify.reset()
    if (!keepDone) setDoneMsg(null)
  }

  function startChange() {
    setDoneMsg(null)
    setMode('editing')
  }

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Mail className="size-4 text-muted" /> {t('settings.email.title')}
          </span>
        }
        description={t('settings.email.desc')}
      />
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-2 text-sm font-medium text-fg">
            {t('settings.f.email')}
            {verified ? (
              <Badge tone="success">
                <BadgeCheck className="size-3.5" /> {t('settings.email.verified')}
              </Badge>
            ) : null}
          </span>
          <Input value={user?.email ?? ''} readOnly disabled />
        </div>

        {/* Unverified banner (informational) */}
        {!verified && mode === 'idle' && (
          <div className="flex items-center gap-2 rounded-lg border border-brand-300/40 bg-brand-50 px-3 py-2.5 text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            <AlertTriangle className="size-4 shrink-0" />
            {t('settings.email.unverified')}
          </div>
        )}

        {mode === 'idle' && (
          <div className="flex items-center justify-between">
            <SavedNote show={!!doneMsg} label={doneMsg ?? ''} />
            <Button variant="outline" onClick={startChange}>
              {t('settings.email.change')}
            </Button>
          </div>
        )}

        {mode === 'editing' && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              request.mutate(newEmail.trim())
            }}
            className="flex flex-col gap-3"
          >
            <Input
              label={t('settings.email.new')}
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              autoFocus
            />
            {request.isError && <ErrorNote error={request.error} />}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => reset()} disabled={request.isPending}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={request.isPending} disabled={!newEmail.trim()}>
                {t('settings.email.sendCode')}
              </Button>
            </div>
          </form>
        )}

        {mode === 'code' && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              verify.mutate()
            }}
            className="flex flex-col gap-3"
          >
            <p className="text-sm text-muted">{t('settings.email.sent', { email: targetEmail })}</p>
            <Input
              label={t('settings.email.code')}
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              autoFocus
            />
            {verify.isError && <ErrorNote error={verify.error} />}
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => request.mutate(targetEmail)}
                loading={request.isPending}
              >
                {t('settings.email.resend')}
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => reset()} disabled={verify.isPending}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" loading={verify.isPending} disabled={code.length < 6}>
                  {t('settings.email.verify')}
                </Button>
              </div>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  )
}

function PasswordCard() {
  const { t } = useI18n()
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [code, setCode] = useState('')

  // Step 1 — email a confirmation code.
  const requestCode = useMutation({ mutationFn: () => usersApi.requestPasswordCode() })
  // Step 2 — change the password with the code.
  const save = useMutation({
    mutationFn: () =>
      usersApi.changePassword({
        old_password: oldPw,
        new_password: newPw,
        new_password_confirm: confirmPw,
        code: code.trim(),
      }),
    onSuccess: () => {
      setOldPw('')
      setNewPw('')
      setConfirmPw('')
      setCode('')
      requestCode.reset()
    },
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    save.mutate()
  }

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Lock className="size-4 text-muted" /> {t('settings.password.title')}
          </span>
        }
        description={t('settings.password.desc')}
      />
      <CardBody>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Input
            label={t('settings.password.old')}
            type="password"
            autoComplete="current-password"
            value={oldPw}
            onChange={(e) => setOldPw(e.target.value)}
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={t('settings.password.new')}
              type="password"
              autoComplete="new-password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
            />
            <Input
              label={t('settings.password.confirm')}
              type="password"
              autoComplete="new-password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              required
            />
          </div>

          {/* Email code (second factor) */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label={t('settings.password.code')}
                inputMode="numeric"
                maxLength={6}
                hint={t('settings.password.codeHint')}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => requestCode.mutate()}
              loading={requestCode.isPending}
              className="mb-[22px]"
            >
              {t('settings.password.sendCode')}
            </Button>
          </div>
          {requestCode.isSuccess && (
            <SavedNote show label={t('settings.password.codeSent')} />
          )}
          {requestCode.isError && <ErrorNote error={requestCode.error} />}

          {save.isError && <ErrorNote error={save.error} />}
          <div className="flex items-center justify-end gap-3">
            <SavedNote show={save.isSuccess} label={t('settings.password.saved')} />
            <Button type="submit" loading={save.isPending} disabled={code.length < 6}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}

function ApiKeyCard() {
  const { t } = useI18n()

  // API keys are a gated feature (§11): resolved per user via /my-features/
  // (staff → override → plan default). Don't even request the key when it's
  // off; the backend's 402 stays as the fallback signal.
  const { isOff, isLoading: featuresLoading } = useMyFeatures()
  const featureOff = isOff('api_key')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['my-api-key'],
    queryFn: usersApi.myApiKey,
    enabled: !featuresLoading && !featureOff,
    retry: false, // a gated-off key 402s deterministically — don't hammer it
  })
  const paidOnly = featureOff || (isError && getApiErrorStatus(error) === 402)

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <KeyRound className="size-4 text-muted" /> {t('settings.apiKey.title')}
          </span>
        }
        description={t('settings.apiKey.desc')}
      />
      <CardBody>
        {featuresLoading || isLoading ? (
          <Spinner />
        ) : paidOnly ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-300/40 bg-brand-50 px-4 py-3 dark:bg-brand-500/10">
            <p className="text-sm text-brand-700 dark:text-brand-300">
              {t('settings.apiKey.paidOnly')}
            </p>
            <Link
              to="/billing"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-500 px-3 text-sm font-semibold text-navy-900 shadow-sm transition-colors hover:bg-brand-400"
            >
              <Sparkles className="size-4" /> {t('points.contactCta')}
            </Link>
          </div>
        ) : isError ? (
          <p className="text-sm text-danger">{getApiErrorMessage(error)}</p>
        ) : data?.key ? (
          <CopyField value={data.key} />
        ) : (
          <p className="text-sm text-muted">—</p>
        )}
      </CardBody>
    </Card>
  )
}

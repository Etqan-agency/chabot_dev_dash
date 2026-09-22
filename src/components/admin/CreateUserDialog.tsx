import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, MailCheck } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { CopyField } from '@/components/ui/CopyField'
import { usersApi } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api'
import { useI18n } from '@/hooks/useI18n'

const EMPTY = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  password_confirm: '',
}

export function CreateUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ ...EMPTY })

  const create = useMutation({
    mutationFn: () => usersApi.create(form),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      void queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleClose() {
    setForm({ ...EMPTY })
    create.reset()
    onClose()
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    create.mutate()
  }

  const created = create.data

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={created ? t('admin.users.created.title') : t('admin.users.create.title')}
      description={created ? undefined : t('admin.users.create.subtitle')}
      footer={
        created ? (
          <Button onClick={handleClose}>{t('common.done')}</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={handleClose} disabled={create.isPending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" form="create-user-form" loading={create.isPending}>
              {t('common.create')}
            </Button>
          </>
        )
      }
    >
      {created ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-success">
            <CheckCircle2 className="size-5" />
            {created.username}
          </div>
          <p className="text-sm text-muted">{t('admin.users.created.note')}</p>
          <CopyField value={created.api_key ?? ''} />
          {created.email_verification === 'activation_sent' && (
            <p className="flex items-start gap-2 rounded-lg border border-steel-500/20 bg-steel-500/5 px-3 py-2 text-sm text-steel-600 dark:text-steel-300">
              <MailCheck className="mt-0.5 size-4 shrink-0" />
              {t('admin.users.created.activationSent', { email: created.email })}
            </p>
          )}
          {created.email_verification === 'send_failed' && (
            <p className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {t('admin.users.created.activationFailed', { email: created.email })}
            </p>
          )}
          {created.email_verification === 'not_sent' && (
            <p className="text-xs text-muted">{t('admin.users.created.activationNotSent')}</p>
          )}
        </div>
      ) : (
        <form id="create-user-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label={t('admin.users.f.username')}
            value={form.username}
            onChange={(e) => set('username', e.target.value)}
            required
            autoFocus
          />
          <Input
            label={t('admin.users.f.email')}
            type="email"
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </div>

          {create.isError && (
            <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              {getApiErrorMessage(create.error)}
            </div>
          )}
        </form>
      )}
    </Modal>
  )
}

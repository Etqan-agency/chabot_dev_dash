import { useEffect, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { usersApi } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api'
import { useI18n } from '@/hooks/useI18n'
import type { User } from '@/types/api'

export function SetPasswordDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const { t } = useI18n()
  const [password, setPassword] = useState('')

  const submit = useMutation({
    mutationFn: () => usersApi.setPassword(user!.id, password),
  })

  // Reset when the target user changes.
  useEffect(() => {
    setPassword('')
    submit.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  function handleClose() {
    setPassword('')
    submit.reset()
    onClose()
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password) submit.mutate()
  }

  const name = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username : ''

  return (
    <Modal
      open={!!user}
      onClose={handleClose}
      title={t('admin.users.setPassword.title', { name })}
      size="sm"
      footer={
        submit.isSuccess ? (
          <Button onClick={handleClose}>{t('common.done')}</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={handleClose} disabled={submit.isPending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" form="set-password-form" loading={submit.isPending}>
              {t('common.save')}
            </Button>
          </>
        )
      }
    >
      {submit.isSuccess ? (
        <p className="flex items-center gap-2 text-sm font-medium text-success">
          <CheckCircle2 className="size-5" />
          {t('admin.users.setPassword.success')}
        </p>
      ) : (
        <form id="set-password-form" onSubmit={handleSubmit}>
          <Input
            label={t('admin.users.setPassword.field')}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            error={submit.isError ? getApiErrorMessage(submit.error) : undefined}
          />
        </form>
      )}
    </Modal>
  )
}

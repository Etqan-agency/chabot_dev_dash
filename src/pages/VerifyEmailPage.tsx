import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { authApi } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api'
import { useI18n } from '@/hooks/useI18n'

type State = 'verifying' | 'success' | 'error'

/** Public activation page hit from the emailed link: /verify-email?uid=..&token=.. */
export default function VerifyEmailPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const uid = params.get('uid') ?? ''
  const token = params.get('token') ?? ''

  const [state, setState] = useState<State>('verifying')
  const [message, setMessage] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    if (!uid || !token) {
      setState('error')
      setMessage(t('verify.missing'))
      return
    }
    authApi
      .verifyEmail(uid, token)
      .then(() => setState('success'))
      .catch((err) => {
        setState('error')
        setMessage(getApiErrorMessage(err, 'verify.errorDesc'))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, token])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg p-6 text-center">
      <div className="mb-8 flex items-center gap-2.5">
        <Logo className="size-9" />
        <span className="text-lg font-semibold tracking-tight text-fg">
          {t('app.name')} {t('app.subtitle')}
        </span>
      </div>

      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-8 shadow-sm">
        {state === 'verifying' && (
          <div className="flex flex-col items-center gap-4">
            <Spinner className="size-8" />
            <p className="text-sm text-muted">{t('verify.verifying')}</p>
          </div>
        )}

        {state === 'success' && (
          <div className="flex flex-col items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="size-7" />
            </span>
            <h1 className="text-xl font-semibold text-fg">{t('verify.success')}</h1>
            <p className="text-sm text-muted">{t('verify.successDesc')}</p>
            <Button className="mt-3 w-full" onClick={() => navigate('/login', { replace: true })}>
              {t('verify.toLogin')}
            </Button>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger">
              <XCircle className="size-7" />
            </span>
            <h1 className="text-xl font-semibold text-fg">{t('verify.error')}</h1>
            <p className="text-sm text-muted">{message || t('verify.errorDesc')}</p>
            <Button
              variant="outline"
              className="mt-3 w-full"
              onClick={() => navigate('/login', { replace: true })}
            >
              {t('verify.toLogin')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

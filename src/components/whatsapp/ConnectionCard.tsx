import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Info, Link2, Power, RefreshCw, Smartphone } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { whatsappApi } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api'
import { SignupCancelled, launchWhatsAppSignup, loadFacebookSdk } from '@/lib/facebookSignup'
import { useI18n } from '@/hooks/useI18n'

/**
 * The tenant's own WhatsApp number: connect it with Meta's Embedded Signup
 * (one popup, no ids or tokens to copy), see its status, or disconnect it.
 */
export function ConnectionCard() {
  const { t } = useI18n()
  const qc = useQueryClient()
  const [notice, setNotice] = useState<{ tone: 'danger' | 'warning' | 'success'; text: string } | null>(
    null,
  )
  const [confirmOff, setConfirmOff] = useState(false)
  const [sdkError, setSdkError] = useState('')

  const conn = useQuery({ queryKey: ['wa-connection'], queryFn: whatsappApi.connection })
  const data = conn.data
  const signup = data?.signup
  const canConnect = !!(data?.allowed && signup?.enabled)

  // Load the SDK ahead of the click: the popup must open straight from it.
  useEffect(() => {
    if (!canConnect || !signup) return
    loadFacebookSdk(signup).catch((e: Error) => setSdkError(e.message))
  }, [canConnect, signup])

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['wa-connection'] })
    void qc.invalidateQueries({ queryKey: ['wa'] })
  }

  const finish = useMutation({
    mutationFn: whatsappApi.embeddedSignup,
    onSuccess: (res) => {
      qc.setQueryData(['wa-connection'], res)
      refresh()
      setNotice(
        res.warning
          ? { tone: 'warning', text: t('wa.conn.connectedWarning', { reason: res.warning }) }
          : { tone: 'success', text: t('wa.conn.connectedOk') },
      )
    },
    onError: (e) => setNotice({ tone: 'danger', text: getApiErrorMessage(e) }),
  })

  const disconnect = useMutation({
    mutationFn: whatsappApi.disconnect,
    onSuccess: (res) => {
      qc.setQueryData(['wa-connection'], res)
      refresh()
      setConfirmOff(false)
      setNotice(null)
    },
    onError: (e) => {
      setConfirmOff(false)
      setNotice({ tone: 'danger', text: getApiErrorMessage(e) })
    },
  })

  const [opening, setOpening] = useState(false)
  const connect = async () => {
    if (!signup) return
    setNotice(null)
    setOpening(true)
    try {
      const FB = await loadFacebookSdk(signup)
      const result = await launchWhatsAppSignup(FB, signup)
      finish.mutate(result)
    } catch (e) {
      if (e instanceof SignupCancelled) {
        if (e.reason !== 'cancelled') setNotice({ tone: 'danger', text: t('wa.conn.popupError', { reason: e.message }) })
      } else {
        setNotice({ tone: 'danger', text: (e as Error).message })
      }
    } finally {
      setOpening(false)
    }
  }

  if (conn.isLoading) {
    return (
      <Card className="mb-6 flex items-center justify-center p-6">
        <Spinner className="size-5" />
      </Card>
    )
  }
  if (conn.isError || !data) {
    return (
      <Card className="mb-6 flex items-center gap-2 p-4 text-sm text-danger">
        <AlertTriangle className="size-4 shrink-0" /> {getApiErrorMessage(conn.error)}
      </Card>
    )
  }

  const account = data.account
  const busy = opening || finish.isPending

  return (
    <Card className="mb-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
            <Smartphone className="size-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-fg">{t('wa.conn.title')}</h2>
              {data.connected ? (
                <Badge tone="success" dot>
                  {t('wa.conn.connected')}
                </Badge>
              ) : (
                <Badge tone="neutral">{t('wa.conn.notConnected')}</Badge>
              )}
            </div>
            {data.connected && account ? (
              <p className="mt-0.5 text-sm text-muted">
                <bdi dir="ltr" className="font-medium text-fg">
                  {account.display_phone_number || account.phone_number_id}
                </bdi>
                {account.display_name && <> · {account.display_name}</>}
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-muted">{t('wa.conn.desc')}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canConnect && (
            <Button
              variant={data.connected ? 'outline' : 'primary'}
              onClick={() => void connect()}
              loading={busy}
              disabled={!!sdkError}
            >
              {data.connected ? <RefreshCw className="size-4" /> : <Link2 className="size-4" />}
              {data.connected ? t('wa.conn.change') : t('wa.conn.connect')}
            </Button>
          )}
          {data.connected && (
            <Button variant="outline" onClick={() => setConfirmOff(true)}>
              <Power className="size-4" /> {t('wa.conn.disconnect')}
            </Button>
          )}
        </div>
      </div>

      {!data.allowed && (
        <Note tone="warning" text={t('wa.conn.notAllowed')} />
      )}
      {data.allowed && !signup?.enabled && !data.connected && (
        <Note tone="info" text={t('wa.conn.contactAdmin')} />
      )}
      {sdkError && <Note tone="danger" text={sdkError} />}
      {data.connected && account?.last_error && !notice && (
        <Note tone="warning" text={t('wa.conn.lastError', { reason: account.last_error })} />
      )}
      {notice && <Note tone={notice.tone} text={notice.text} />}

      <ConfirmDialog
        open={confirmOff}
        title={t('wa.conn.disconnect.title')}
        message={t('wa.conn.disconnect.message')}
        confirmLabel={t('wa.conn.disconnect')}
        destructive
        loading={disconnect.isPending}
        onConfirm={() => disconnect.mutate()}
        onClose={() => setConfirmOff(false)}
      />
    </Card>
  )
}

function Note({ tone, text }: { tone: 'danger' | 'warning' | 'success' | 'info'; text: string }) {
  const styles = {
    danger: 'border-danger/30 bg-danger/5 text-danger',
    warning: 'border-brand-400/40 bg-brand-500/5 text-brand-700 dark:text-brand-300',
    success: 'border-success/30 bg-success/5 text-success',
    info: 'border-steel-500/30 bg-steel-500/5 text-steel-600 dark:text-steel-300',
  }[tone]
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'info' ? Info : AlertTriangle
  return (
    <div className={`mt-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${styles}`}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{text}</span>
    </div>
  )
}

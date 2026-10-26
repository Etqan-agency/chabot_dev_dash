import { useState, type FormEvent, type ReactNode } from 'react'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  MessageSquare,
  Pencil,
  Plus,
  Power,
  Search,
  Send,
  Smartphone,
  Trash2,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ConnectionCard } from '@/components/whatsapp/ConnectionCard'
import { usersApi, whatsappApi } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/useAuth'
import { useI18n } from '@/hooks/useI18n'
import { useDebounce } from '@/hooks/useDebounce'
import type {
  Paginated,
  WhatsAppAccount,
  WhatsAppAnalyticsRow,
  WhatsAppContact,
  WhatsAppMessage,
  WhatsAppSession,
} from '@/types/api'

type Tab = 'messages' | 'contacts' | 'sessions' | 'accounts' | 'analytics'

function statusTone(status?: string): BadgeTone {
  const s = (status ?? '').toLowerCase()
  if (['sent', 'delivered', 'read', 'active', 'success'].includes(s)) return 'success'
  if (['failed', 'error', 'undelivered'].includes(s)) return 'danger'
  return 'neutral'
}

export default function WhatsAppPage() {
  const { t } = useI18n()
  const { isAdmin } = useAuth()
  const [tab, setTab] = useState<Tab>('messages')
  const [sendOpen, setSendOpen] = useState(false)

  const tabs: { key: Tab; icon: typeof MessageSquare }[] = [
    { key: 'messages', icon: MessageSquare },
    { key: 'contacts', icon: Users },
    { key: 'sessions', icon: Clock },
    ...(isAdmin ? [{ key: 'accounts' as Tab, icon: Smartphone }] : []),
    { key: 'analytics', icon: BarChart3 },
  ]

  return (
    <div>
      <PageHeader
        title={t('wa.title')}
        description={t('wa.subtitle')}
        actions={
          <Button onClick={() => setSendOpen(true)}>
            <Send className="size-4" /> {t('wa.send')}
          </Button>
        }
      />

      <ConnectionCard />

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              tab === tb.key
                ? 'bg-brand-500 text-navy-900'
                : 'text-muted hover:bg-surface2 hover:text-fg',
            )}
          >
            <tb.icon className="size-4" />
            {t(`wa.tab.${tb.key}`)}
          </button>
        ))}
      </div>

      {tab === 'messages' && <MessagesTab />}
      {tab === 'contacts' && <ContactsTab />}
      {tab === 'sessions' && <SessionsTab />}
      {tab === 'accounts' && isAdmin && <AccountsTab />}
      {tab === 'analytics' && <AnalyticsTab />}

      <SendDialog open={sendOpen} onClose={() => setSendOpen(false)} />
    </div>
  )
}

/* ----------------------------------------------------------------- shells -- */

function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="relative mb-4">
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ps-9"
      />
    </div>
  )
}

function ListShell<T>({
  query,
  icon,
  emptyTitle,
  emptyDesc,
  emptyAction,
  children,
}: {
  query: UseQueryResult<Paginated<T>>
  icon: typeof MessageSquare
  emptyTitle: string
  emptyDesc: string
  emptyAction?: ReactNode
  children: (rows: T[]) => ReactNode
}) {
  const { t } = useI18n()
  const rows = query.data?.results ?? []
  return (
    <Card className="overflow-hidden">
      {query.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-7" />
        </div>
      ) : query.isError ? (
        <div className="flex items-center gap-3 p-6 text-sm text-danger">
          <AlertTriangle className="size-5 shrink-0" />
          <div>
            <p className="font-medium">{t('wa.loadError')}</p>
            <p className="text-muted">{getApiErrorMessage(query.error)}</p>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={icon} title={emptyTitle} description={emptyDesc} action={emptyAction} />
      ) : (
        <div className="overflow-x-auto">{children(rows)}</div>
      )}
    </Card>
  )
}

const TH = 'px-5 py-3 text-start font-semibold'
const headRow = 'border-b border-border text-start text-xs uppercase tracking-wide text-muted'
const bodyRow = 'border-b border-border/60 last:border-0 hover:bg-surface2/60'

/* --------------------------------------------------------------- messages -- */

function MessagesTab() {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const q = useDebounce(search)
  const query = useQuery({
    queryKey: ['wa', 'messages', q],
    queryFn: () => whatsappApi.messages({ ordering: '-created_at', ...(q ? { search: q } : {}) }),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <SearchBar value={search} onChange={setSearch} placeholder={t('wa.search.messages')} />
      <ListShell<WhatsAppMessage>
        query={query}
        icon={MessageSquare}
        emptyTitle={t('wa.msg.empty.title')}
        emptyDesc={t('wa.msg.empty.desc')}
      >
        {(rows) => (
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className={headRow}>
                <th className={TH}>{t('wa.msg.col.contact')}</th>
                <th className={TH}>{t('wa.msg.col.message')}</th>
                <th className={TH}>{t('wa.msg.col.type')}</th>
                <th className={TH}>{t('wa.msg.col.status')}</th>
                <th className={TH}>{t('wa.msg.col.time')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const dir = (m.direction ?? '').toLowerCase()
                return (
                  <tr key={m.id} className={bodyRow}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-fg">{m.profile_name || m.phone_number || '—'}</p>
                      {dir && (
                        <Badge tone={dir.startsWith('in') ? 'steel' : 'brand'}>
                          {dir.startsWith('in') ? t('wa.msg.in') : t('wa.msg.out')}
                        </Badge>
                      )}
                    </td>
                    <td className="max-w-sm px-5 py-3">
                      <p className="truncate text-muted" dir="auto" title={m.message_text}>
                        {m.message_text || '—'}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-muted">{m.message_type || '—'}</td>
                    <td className="px-5 py-3">
                      {m.status ? <Badge tone={statusTone(m.status)}>{m.status}</Badge> : '—'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted">
                      {m.created_at || m.timestamp ? formatDate((m.created_at || m.timestamp)!) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </ListShell>
    </>
  )
}

/* --------------------------------------------------------------- contacts -- */

function ContactsTab() {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const q = useDebounce(search)
  const query = useQuery({
    queryKey: ['wa', 'contacts', q],
    queryFn: () => whatsappApi.contacts(q ? { search: q } : undefined),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <SearchBar value={search} onChange={setSearch} placeholder={t('wa.search.contacts')} />
      <ListShell<WhatsAppContact>
        query={query}
        icon={Users}
        emptyTitle={t('wa.contacts.empty.title')}
        emptyDesc={t('wa.contacts.empty.desc')}
      >
        {(rows) => (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className={headRow}>
                <th className={TH}>{t('wa.contacts.col.phone')}</th>
                <th className={TH}>{t('wa.contacts.col.name')}</th>
                <th className={TH}>{t('wa.contacts.col.language')}</th>
                <th className={TH}>{t('wa.contacts.col.status')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className={bodyRow}>
                  <td className="px-5 py-3 font-medium text-fg" dir="ltr">
                    {c.phone_number}
                  </td>
                  <td className="px-5 py-3 text-muted">{c.profile_name || '—'}</td>
                  <td className="px-5 py-3 text-muted">{c.language_preference || '—'}</td>
                  <td className="px-5 py-3">
                    <Badge tone={c.is_active ? 'success' : 'neutral'} dot>
                      {c.is_active ? t('common.active') : t('common.inactive')}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ListShell>
    </>
  )
}

/* --------------------------------------------------------------- sessions -- */

function SessionsTab() {
  const { t } = useI18n()
  const query = useQuery({
    queryKey: ['wa', 'sessions'],
    queryFn: () => whatsappApi.sessions({ ordering: '-updated_at' }),
    placeholderData: keepPreviousData,
  })

  return (
    <ListShell<WhatsAppSession>
      query={query}
      icon={Clock}
      emptyTitle={t('wa.sessions.empty.title')}
      emptyDesc={t('wa.sessions.empty.desc')}
    >
      {(rows) => (
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className={headRow}>
              <th className={TH}>{t('wa.sessions.col.contact')}</th>
              <th className={TH}>{t('wa.sessions.col.type')}</th>
              <th className={TH}>{t('wa.sessions.col.status')}</th>
              <th className={TH}>{t('wa.sessions.col.updated')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className={bodyRow}>
                <td className="px-5 py-3 font-medium text-fg">
                  {s.profile_name || s.phone_number || s.user || '—'}
                </td>
                <td className="px-5 py-3 text-muted">{s.session_type || '—'}</td>
                <td className="px-5 py-3">
                  <Badge tone={s.is_active ? 'success' : 'neutral'} dot>
                    {s.is_active ? t('common.active') : t('common.inactive')}
                  </Badge>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-muted">
                  {s.updated_at || s.created_at ? formatDate((s.updated_at || s.created_at)!) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ListShell>
  )
}

/* -------------------------------------------------------------- analytics -- */

function AnalyticsTab() {
  const { t } = useI18n()
  const query = useQuery({
    queryKey: ['wa', 'analytics'],
    queryFn: () => whatsappApi.analytics({ ordering: '-date' }),
    placeholderData: keepPreviousData,
  })

  const rows = query.data?.results ?? []
  // Derive metric columns from the data (any numeric field besides id).
  const metricKeys = Array.from(
    new Set(
      rows.flatMap((r) =>
        Object.entries(r)
          .filter(([k, v]) => typeof v === 'number' && k !== 'id')
          .map(([k]) => k),
      ),
    ),
  )
  const humanize = (k: string) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <ListShell<WhatsAppAnalyticsRow>
      query={query}
      icon={BarChart3}
      emptyTitle={t('wa.analytics.empty.title')}
      emptyDesc={t('wa.analytics.empty.desc')}
    >
      {(data) => (
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className={headRow}>
              <th className={TH}>{t('wa.analytics.col.date')}</th>
              {metricKeys.map((k) => (
                <th key={k} className={TH}>
                  {humanize(k)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={r.id ?? `${r.date}-${i}`} className={bodyRow}>
                <td className="whitespace-nowrap px-5 py-3 font-medium text-fg">
                  {r.date ? formatDate(r.date) : '—'}
                </td>
                {metricKeys.map((k) => (
                  <td key={k} className="px-5 py-3 tabular-nums text-muted">
                    {typeof r[k] === 'number' ? (r[k] as number).toLocaleString('en') : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ListShell>
  )
}

/* --------------------------------------------------------------- accounts -- */

function AccountsTab() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<WhatsAppAccount | null>(null)
  const [toDelete, setToDelete] = useState<WhatsAppAccount | null>(null)
  const q = useDebounce(search)

  const query = useQuery({
    queryKey: ['wa', 'accounts', q],
    queryFn: () => whatsappApi.accounts.list(q ? { search: q } : undefined),
    placeholderData: keepPreviousData,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['wa', 'accounts'] })
  const toggle = useMutation({
    mutationFn: (a: WhatsAppAccount) =>
      whatsappApi.accounts.update(a.id, { is_active: !a.is_active }),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: string) => whatsappApi.accounts.remove(id),
    onSuccess: () => {
      void invalidate()
      setToDelete(null)
    },
  })

  const tenantOf = (a: WhatsAppAccount) => a.tenant_username || a.username || a.tenant

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input
            placeholder={t('wa.search.accounts')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" /> {t('wa.accounts.add')}
        </Button>
      </div>

      <ListShell<WhatsAppAccount>
        query={query}
        icon={Smartphone}
        emptyTitle={t('wa.accounts.empty.title')}
        emptyDesc={t('wa.accounts.empty.desc')}
        emptyAction={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" /> {t('wa.accounts.add')}
          </Button>
        }
      >
        {(rows) => (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className={headRow}>
                <th className={TH}>{t('wa.accounts.col.tenant')}</th>
                <th className={TH}>{t('wa.accounts.col.number')}</th>
                <th className={TH}>{t('wa.accounts.col.name')}</th>
                <th className={TH}>{t('wa.accounts.col.status')}</th>
                <th className="px-5 py-3 text-end font-semibold">{t('wa.accounts.col.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className={bodyRow}>
                  <td className="px-5 py-3 font-medium text-fg">{tenantOf(a)}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted" dir="ltr">
                    {a.phone_number_id}
                  </td>
                  <td className="px-5 py-3 text-muted">{a.display_name}</td>
                  <td className="px-5 py-3">
                    <Badge tone={a.is_active === false ? 'neutral' : 'success'} dot>
                      {a.is_active === false ? t('common.inactive') : t('common.active')}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <IconAction
                        label={a.is_active === false ? t('common.active') : t('common.inactive')}
                        onClick={() => toggle.mutate(a)}
                        busy={toggle.isPending && toggle.variables?.id === a.id}
                        className={a.is_active === false ? 'text-faint' : 'text-success'}
                      >
                        <Power className="size-4" />
                      </IconAction>
                      <IconAction
                        label={t('common.edit')}
                        onClick={() => {
                          setEditing(a)
                          setFormOpen(true)
                        }}
                      >
                        <Pencil className="size-4" />
                      </IconAction>
                      <IconAction
                        label={t('common.delete')}
                        onClick={() => setToDelete(a)}
                        className="text-danger hover:bg-danger/10"
                      >
                        <Trash2 className="size-4" />
                      </IconAction>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ListShell>

      <AccountDialog open={formOpen} account={editing} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={!!toDelete}
        title={t('wa.accounts.delete.title')}
        message={t('wa.accounts.delete.message', { name: toDelete?.display_name ?? '' })}
        confirmLabel={t('common.delete')}
        destructive
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
    </>
  )
}

function AccountDialog({
  open,
  account,
  onClose,
}: {
  open: boolean
  account: WhatsAppAccount | null
  onClose: () => void
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const editing = !!account
  const [tenant, setTenant] = useState('')
  const [phoneId, setPhoneId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [accessToken, setAccessToken] = useState('')

  const { data: users } = useQuery({
    queryKey: ['users', { page: 1, ordering: 'username' }],
    queryFn: () => usersApi.list({ page: 1, ordering: 'username' }),
    enabled: open && !editing,
  })

  // Sync fields when the dialog opens / target changes.
  const key = (open ? '1' : '0') + (account?.id ?? '')
  const [syncedKey, setSyncedKey] = useState('')
  if (key !== syncedKey) {
    setSyncedKey(key)
    setTenant(account?.tenant ?? '')
    setPhoneId(account?.phone_number_id ?? '')
    setDisplayName(account?.display_name ?? '')
    setAccessToken('')
  }

  const save = useMutation({
    mutationFn: () => {
      if (editing) {
        return whatsappApi.accounts.update(account!.id, {
          phone_number_id: phoneId.trim(),
          display_name: displayName.trim(),
          ...(accessToken.trim() ? { access_token: accessToken.trim() } : {}),
        })
      }
      return whatsappApi.accounts.create({
        tenant,
        phone_number_id: phoneId.trim(),
        display_name: displayName.trim(),
        ...(accessToken.trim() ? { access_token: accessToken.trim() } : {}),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wa', 'accounts'] })
      onClose()
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    save.mutate()
  }

  const userOptions = [
    { value: '', label: t('wa.accounts.f.selectTenant') },
    ...(users?.results ?? []).map((u) => ({ value: u.id, label: `${u.username} · ${u.email}` })),
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t('wa.accounts.form.editTitle') : t('wa.accounts.form.title')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form="wa-account-form"
            loading={save.isPending}
            disabled={(!editing && !tenant) || !phoneId.trim() || !displayName.trim()}
          >
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="wa-account-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!editing && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-fg">{t('wa.accounts.f.tenant')}</label>
            <Select options={userOptions} value={tenant} onChange={(e) => setTenant(e.target.value)} />
          </div>
        )}
        <Input
          label={t('wa.accounts.f.phoneId')}
          hint={t('wa.accounts.f.phoneIdHint')}
          value={phoneId}
          onChange={(e) => setPhoneId(e.target.value)}
          required
          dir="ltr"
        />
        <Input
          label={t('wa.accounts.f.displayName')}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
        <Input
          label={t('wa.accounts.f.accessToken')}
          hint={t('wa.accounts.f.accessTokenHint')}
          type="password"
          autoComplete="off"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          dir="ltr"
        />
        {save.isError && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {getApiErrorMessage(save.error)}
          </div>
        )}
      </form>
    </Modal>
  )
}

/* ------------------------------------------------------------------- send -- */

function SendDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const [to, setTo] = useState('')
  const [message, setMessage] = useState('')

  const send = useMutation({
    mutationFn: () => whatsappApi.send({ to_number: to.trim(), message }),
  })

  function handleClose() {
    setTo('')
    setMessage('')
    send.reset()
    onClose()
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (to.trim() && message.trim()) send.mutate()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('wa.send.title')}
      footer={
        send.isSuccess ? (
          <Button onClick={handleClose}>{t('common.done')}</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={handleClose} disabled={send.isPending}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              form="wa-send-form"
              loading={send.isPending}
              disabled={!to.trim() || !message.trim()}
            >
              <Send className="size-4" /> {t('wa.send')}
            </Button>
          </>
        )
      }
    >
      {send.isSuccess ? (
        <p className="flex items-center gap-2 text-sm font-medium text-success">
          <CheckCircle2 className="size-5" />
          {t('wa.send.success', { status: send.data.status })}
        </p>
      ) : (
        <form id="wa-send-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label={t('wa.send.to')}
            hint={t('wa.send.toHint')}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            dir="ltr"
            inputMode="numeric"
            required
            autoFocus
          />
          <Textarea
            label={t('wa.send.message')}
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          {send.isError && (
            <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              {getApiErrorMessage(send.error)}
            </div>
          )}
        </form>
      )}
    </Modal>
  )
}

function IconAction({
  label,
  onClick,
  busy,
  className,
  children,
}: {
  label: string
  onClick: () => void
  busy?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={busy}
      className={cn(
        'rounded-lg p-2 text-muted transition-colors hover:bg-surface2 disabled:opacity-50',
        className,
      )}
    >
      {children}
    </button>
  )
}

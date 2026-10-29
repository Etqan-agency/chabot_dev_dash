import { useEffect, useRef, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Bell,
  BellOff,
  Bike,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Clock,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  RefreshCw,
  Search,
  ShoppingBag,
  StickyNote,
  Store,
  User,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ordersApi } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { useDebounce } from '@/hooks/useDebounce'
import { useI18n } from '@/hooks/useI18n'
import type { Lang } from '@/i18n/translations'
import type { ListParams, Order, OrderStatus } from '@/types/api'

/** New orders arrive by phone and WhatsApp at any moment; the page polls for them. */
const POLL_MS = 10_000
const SOUND_KEY = 'orders.sound'

const STATUS_TONES: Record<OrderStatus, BadgeTone> = {
  new: 'brand',
  preparing: 'steel',
  delivered: 'success',
  cancelled: 'neutral',
}

/** The one forward step each open status offers. */
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  new: 'preparing',
  preparing: 'delivered',
}

const TABS: (OrderStatus | '')[] = ['new', 'preparing', 'delivered', 'cancelled', '']

export default function OrdersPage() {
  const { t, dir, lang } = useI18n()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<OrderStatus | ''>('new')
  const [source, setSource] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [toCancel, setToCancel] = useState<Order | null>(null)
  const debouncedSearch = useDebounce(search)

  const params: ListParams = {
    page,
    ordering: status === 'new' ? 'created_at' : '-created_at', // oldest new order first: it has waited longest
    ...(status ? { status } : {}),
    ...(source ? { source } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  }

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['orders', params],
    queryFn: () => ordersApi.list(params),
    placeholderData: keepPreviousData,
    refetchInterval: POLL_MS,
  })

  // Always watched, whatever tab is open: drives the counter, tab title and sound.
  const { data: newOrders } = useQuery({
    queryKey: ['orders', 'new-watch'],
    queryFn: () => ordersApi.list({ status: 'new', ordering: '-number' }),
    refetchInterval: POLL_MS,
  })
  const newCount = newOrders?.count ?? 0
  // undefined until the first poll returns, so existing orders don't chime on load
  const alert = useNewOrderAlert(newOrders ? (newOrders.results[0]?.number ?? 0) : undefined)
  useTabTitleCount(newCount)

  const updateStatus = useMutation({
    mutationFn: ({ id, next }: { id: string; next: OrderStatus }) => ordersApi.setStatus(id, next),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      setToCancel(null)
    },
  })

  const rows = data?.results ?? []
  const total = data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 20))
  const hasFilters = !!debouncedSearch || !!source
  const PrevIcon = dir === 'rtl' ? ChevronRight : ChevronLeft
  const NextIcon = dir === 'rtl' ? ChevronLeft : ChevronRight

  const sourceOptions = [
    { value: '', label: t('orders.source.all') },
    { value: 'voice', label: t('orders.source.voice') },
    { value: 'whatsapp', label: t('orders.source.whatsapp') },
  ]

  return (
    <div>
      <PageHeader
        title={t('orders.title')}
        description={t('orders.subtitle')}
        actions={
          <Button variant={alert.enabled ? 'secondary' : 'outline'} size="sm" onClick={alert.toggle}>
            {alert.enabled ? <Bell className="size-4" /> : <BellOff className="size-4" />}
            {alert.enabled ? t('orders.sound.on') : t('orders.sound.off')}
          </Button>
        }
      />

      {/* Status tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab || 'all'}
            onClick={() => {
              setStatus(tab)
              setPage(1)
            }}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
              status === tab
                ? 'border-brand-500 bg-brand-500 text-navy-900'
                : 'border-border bg-surface text-muted hover:bg-surface2',
            )}
          >
            {t(tab ? `orders.status.${tab}` : 'orders.status.all')}
            {tab === 'new' && newCount > 0 && (
              <span className="min-w-5 rounded-full bg-danger px-1.5 text-xs leading-5 text-white">
                {newCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input
            placeholder={t('orders.search')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="ps-9"
          />
        </div>
        <Select
          options={sourceOptions}
          value={source}
          onChange={(e) => {
            setSource(e.target.value)
            setPage(1)
          }}
          className="sm:w-48"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-7" />
        </div>
      ) : isError ? (
        <Card className="flex items-center gap-3 p-6 text-sm text-danger">
          <AlertTriangle className="size-5 shrink-0" />
          <div>
            <p className="font-medium">{t('orders.loadError')}</p>
            <p className="text-muted">{getApiErrorMessage(error)}</p>
          </div>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={ShoppingBag}
            title={hasFilters ? t('orders.emptyFiltered.title') : t('orders.empty.title')}
            description={hasFilters ? t('orders.emptyFiltered.desc') : t('orders.empty.desc')}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {rows.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              lang={lang}
              busy={updateStatus.isPending && updateStatus.variables?.id === order.id}
              onAdvance={(next) => updateStatus.mutate({ id: order.id, next })}
              onCancel={() => setToCancel(order)}
            />
          ))}
        </div>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <span className="flex items-center gap-2">
            {t('orders.count', { n: total })}
            {isFetching && <RefreshCw className="size-3.5 animate-spin text-faint" />}
          </span>
          <div className="flex items-center gap-2">
            <span>
              {t('common.page')} {page} {t('common.of')} {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!data?.previous}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <PrevIcon className="size-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={!data?.next} onClick={() => setPage((p) => p + 1)}>
              <NextIcon className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {updateStatus.isError && (
        <p className="mt-4 text-sm text-danger">{getApiErrorMessage(updateStatus.error)}</p>
      )}

      <ConfirmDialog
        open={!!toCancel}
        title={t('orders.cancel.title', { n: toCancel?.number ?? '' })}
        message={t('orders.cancel.message')}
        confirmLabel={t('orders.action.cancel')}
        destructive
        loading={updateStatus.isPending}
        onConfirm={() => toCancel && updateStatus.mutate({ id: toCancel.id, next: 'cancelled' })}
        onClose={() => setToCancel(null)}
      />
    </div>
  )
}

function OrderCard({
  order,
  lang,
  busy,
  onAdvance,
  onCancel,
}: {
  order: Order
  lang: Lang
  busy: boolean
  onAdvance: (next: OrderStatus) => void
  onCancel: () => void
}) {
  const { t } = useI18n()
  const money = (value: string) => formatMoney(value, order.currency, lang)
  const next = NEXT_STATUS[order.status]
  const phoneDigits = order.customer_phone.replace(/\D/g, '')
  const isNew = order.status === 'new'

  return (
    <Card className={cn('flex flex-col', isNew && 'border-brand-500/60 ring-1 ring-brand-500/30')}>
      {/* Header: number, status, where it came from */}
      <div className="flex items-start justify-between gap-3 border-b border-border p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-fg">#{order.number}</span>
            <Badge tone={STATUS_TONES[order.status]} dot>
              {t(`orders.status.${order.status}`)}
            </Badge>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted" title={new Date(order.created_at).toLocaleString()}>
            <Clock className="size-3.5" />
            {timeAgo(order.created_at, lang)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge tone="neutral">
            {order.source === 'whatsapp' ? <MessageCircle className="size-3.5" /> : <Phone className="size-3.5" />}
            {t(`orders.source.${order.source}`)}
          </Badge>
          <Badge tone={order.fulfilment === 'delivery' ? 'brand' : 'steel'}>
            {order.fulfilment === 'delivery' ? <Bike className="size-3.5" /> : <Store className="size-3.5" />}
            {t(`orders.fulfilment.${order.fulfilment}`)}
          </Badge>
        </div>
      </div>

      {/* Customer */}
      <div className="space-y-1.5 border-b border-border p-4 text-sm">
        <p className="flex items-center gap-2 font-medium text-fg" dir="auto">
          <User className="size-4 shrink-0 text-faint" />
          {order.customer_name || t('orders.noName')}
        </p>
        {order.customer_phone && (
          <p className="flex items-center gap-2 text-muted">
            <Phone className="size-4 shrink-0 text-faint" />
            <a href={`tel:+${phoneDigits}`} className="hover:text-fg hover:underline" dir="ltr">
              +{phoneDigits}
            </a>
            <a
              href={`https://wa.me/${phoneDigits}`}
              target="_blank"
              rel="noreferrer"
              className="text-success hover:underline"
            >
              {t('orders.whatsappLink')}
            </a>
          </p>
        )}
        {order.fulfilment === 'delivery' && (
          <p className="flex items-start gap-2 text-fg" dir="auto">
            <MapPin className="mt-0.5 size-4 shrink-0 text-faint" />
            {order.address || t('orders.noAddress')}
          </p>
        )}
      </div>

      {/* Items */}
      <ul className="flex-1 divide-y divide-border/60 px-4 text-sm">
        {order.items.map((item) => (
          <li key={item.id} className="py-2.5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-fg" dir="auto">
                <span className="me-1.5 inline-block min-w-7 rounded-md bg-surface2 px-1.5 text-center font-semibold">
                  {item.quantity}×
                </span>
                {item.name}
              </p>
              <span className="shrink-0 tabular-nums text-muted">{money(item.line_total)}</span>
            </div>
            {item.notes && (
              <p className="ms-9 mt-1 inline-flex items-center gap-1 rounded-md bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" dir="auto">
                <StickyNote className="size-3" />
                {item.notes}
              </p>
            )}
          </li>
        ))}
      </ul>

      {order.notes && (
        <p className="mx-4 mb-2 flex items-start gap-2 rounded-lg bg-surface2 px-3 py-2 text-sm text-fg" dir="auto">
          <StickyNote className="mt-0.5 size-4 shrink-0 text-faint" />
          {order.notes}
        </p>
      )}

      {/* Totals */}
      <div className="space-y-1 border-t border-border p-4 text-sm">
        <Row label={t('orders.subtotal')} value={money(order.subtotal)} />
        {order.fulfilment === 'delivery' && <Row label={t('orders.deliveryFee')} value={money(order.delivery_fee)} />}
        <div className="flex items-center justify-between pt-1 text-base font-bold text-fg">
          <span>{t('orders.total')}</span>
          <span className="tabular-nums">{money(order.total)}</span>
        </div>
      </div>

      {next && (
        <div className="flex gap-2 border-t border-border p-4">
          <Button className="flex-1" loading={busy} onClick={() => onAdvance(next)}>
            {next === 'preparing' ? <ChefHat className="size-4" /> : <PackageCheck className="size-4" />}
            {t(`orders.action.${next}`)}
          </Button>
          <Button variant="ghost" className="text-danger" onClick={onCancel} disabled={busy}>
            <CircleX className="size-4" />
            {t('orders.action.cancel')}
          </Button>
        </div>
      )}
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

function formatMoney(value: string, currency: string, lang: Lang): string {
  const amount = Number(value)
  try {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount} ${currency}` // unknown currency code
  }
}

function timeAgo(iso: string, lang: Lang): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  const abs = Math.abs(seconds)
  if (abs < 60) return rtf.format(seconds, 'second')
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour')
  return rtf.format(Math.round(seconds / 86400), 'day')
}

/** Prefix the browser tab with the number of waiting orders, e.g. "(2) …". */
function useTabTitleCount(count: number) {
  useEffect(() => {
    const original = document.title.replace(/^\(\d+\)\s*/, '')
    document.title = count > 0 ? `(${count}) ${original}` : original
    return () => {
      document.title = original
    }
  }, [count])
}

/**
 * A chime when an order with a higher number than any seen so far arrives.
 * Browsers only allow audio after a user gesture, so the sound is opt-in via a
 * button (which also unlocks the AudioContext); the choice is remembered.
 */
function useNewOrderAlert(latestNumber: number | undefined) {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) === '1'
    } catch {
      return false
    }
  })
  const audio = useRef<AudioContext | null>(null)
  const lastSeen = useRef<number | null>(null)

  function chime() {
    try {
      audio.current ??= new AudioContext()
    } catch {
      return // no Web Audio
    }
    const ctx = audio.current
    void ctx.resume()
    ;[0, 0.18].forEach((offset, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = i === 0 ? 880 : 1175
      gain.gain.setValueAtTime(0.2, ctx.currentTime + offset)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.35)
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + offset)
      osc.stop(ctx.currentTime + offset + 0.35)
    })
  }

  function toggle() {
    const next = !enabled
    setEnabled(next)
    try {
      localStorage.setItem(SOUND_KEY, next ? '1' : '0')
    } catch {
      // storage unavailable: the choice lasts for this visit only
    }
    if (next) chime() // also unlocks audio inside this click
  }

  useEffect(() => {
    if (latestNumber === undefined) return
    if (lastSeen.current === null) {
      lastSeen.current = latestNumber // first load: existing orders aren't "new arrivals"
      return
    }
    if (latestNumber > lastSeen.current) {
      lastSeen.current = latestNumber
      if (enabled) chime()
    }
    // chime only reads refs; re-running on `enabled` must not replay an old arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestNumber])

  return { enabled, toggle }
}

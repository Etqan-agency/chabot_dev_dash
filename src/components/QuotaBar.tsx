import { cn } from '@/lib/cn'

/**
 * A labelled usage bar. `max <= 0` is treated as "unlimited" and renders a flat
 * informational bar instead of a fill ratio.
 */
export function QuotaBar({
  label,
  used,
  max,
  unit = '',
  unlimitedLabel = 'unlimited',
  formatValue = (n) => n.toLocaleString('en'),
}: {
  label: string
  used: number
  max: number
  unit?: string
  unlimitedLabel?: string
  formatValue?: (n: number) => string
}) {
  const unlimited = max <= 0
  const ratio = unlimited ? 0 : Math.min(used / max, 1)
  const danger = ratio >= 0.9
  const warn = ratio >= 0.7 && !danger

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-fg">{label}</span>
        <span className="text-muted">
          {formatValue(used)}
          {unit}
          {unlimited ? (
            <span className="text-success"> · {unlimitedLabel}</span>
          ) : (
            <>
              {' '}
              / {formatValue(max)}
              {unit}
            </>
          )}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface2">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            unlimited
              ? 'bg-steel-400/40'
              : danger
                ? 'bg-danger'
                : warn
                  ? 'bg-brand-500'
                  : 'bg-success',
          )}
          style={{ width: unlimited ? '100%' : `${Math.max(ratio * 100, 2)}%` }}
        />
      </div>
    </div>
  )
}

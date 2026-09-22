import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Card } from '@/components/ui/Card'

type Accent = 'brand' | 'steel' | 'navy' | 'success'

const accents: Record<Accent, string> = {
  brand: 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  steel: 'bg-steel-500/10 text-steel-600 dark:text-steel-300',
  navy: 'bg-navy-100 text-navy-700 dark:bg-navy-700 dark:text-navy-200',
  success: 'bg-success/10 text-success',
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = 'brand',
}: {
  label: string
  value: string
  sub?: string
  icon: LucideIcon
  accent?: Accent
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-fg">
            {value}
          </p>
          {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
        </div>
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', accents[accent])}>
          <Icon className="size-5" />
        </span>
      </div>
    </Card>
  )
}

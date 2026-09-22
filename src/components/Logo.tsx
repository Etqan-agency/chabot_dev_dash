import { cn } from '@/lib/cn'

/** Brand mark: amber speech bubble on navy, matching the favicon. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#16202E" />
      <path
        d="M8 11a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-6l-5 4v-4a4 4 0 0 1-1-3v-7z"
        fill="#E5A23C"
      />
      <circle cx="13" cy="14" r="1.6" fill="#16202E" />
      <circle cx="19" cy="14" r="1.6" fill="#16202E" />
    </svg>
  )
}

export function Wordmark({
  className,
  title = 'click.ai',
  subtitle = 'Console',
}: {
  className?: string
  title?: string
  subtitle?: string
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Logo />
      <div className="leading-tight">
        <div className="font-semibold tracking-tight text-fg">{title}</div>
        <div className="text-[11px] font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400">
          {subtitle}
        </div>
      </div>
    </div>
  )
}

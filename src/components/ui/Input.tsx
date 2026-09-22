import { forwardRef, type InputHTMLAttributes, useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useI18n } from '@/hooks/useI18n'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, error, hint, id, type = 'text', ...props },
  ref,
) {
  const { t } = useI18n()
  const generatedId = useId()
  const inputId = id ?? generatedId

  const isPassword = type === 'password'
  const [reveal, setReveal] = useState(false)
  const inputType = isPassword && reveal ? 'text' : type

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-fg">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={inputType}
          className={cn(
            'h-10 w-full rounded-lg border bg-surface px-3 text-sm text-fg placeholder:text-faint',
            'transition-colors focus:border-brand-400',
            error ? 'border-danger' : 'border-border',
            isPassword && 'pe-10',
            className,
          )}
          aria-invalid={error ? true : undefined}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            tabIndex={-1}
            aria-label={reveal ? t('common.hidePassword') : t('common.showPassword')}
            title={reveal ? t('common.hidePassword') : t('common.showPassword')}
            className="absolute end-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted transition-colors hover:bg-surface2 hover:text-fg"
          >
            {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-faint">{hint}</p>
      ) : null}
    </div>
  )
})

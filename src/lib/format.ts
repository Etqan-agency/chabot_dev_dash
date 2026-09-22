/** Compact number, e.g. 3904000 -> "3.9M". */
export function compactNumber(n: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

export function fullNumber(n: number): string {
  return new Intl.NumberFormat('en').format(n)
}

export function usd(n: number): string {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: n < 1 ? 4 : 2,
  }).format(n)
}

export function percent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}

export function ms(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`
  return `${Math.round(value)}ms`
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' })
}

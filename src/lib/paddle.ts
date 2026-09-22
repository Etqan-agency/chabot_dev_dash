/**
 * Paddle Billing checkout (FRONTEND_API.md §7).
 *
 * The frontend opens Paddle Checkout with a plan's `paddle_price_id`; the
 * backend fulfills via a signed webhook — we never post payment data to the
 * API. Requires the client-side token in `VITE_PADDLE_CLIENT_TOKEN`
 * (and `VITE_PADDLE_ENV=sandbox` while testing).
 */

interface PaddleCheckoutItem {
  priceId: string
  quantity: number
}

interface PaddleGlobal {
  Environment?: { set: (env: string) => void }
  Initialized?: boolean
  Initialize: (opts: { token: string; eventCallback?: (event: { name?: string }) => void }) => void
  Checkout: {
    open: (opts: {
      items: PaddleCheckoutItem[]
      customer?: { email?: string }
      customData?: Record<string, unknown>
    }) => void
  }
}

declare global {
  interface Window {
    Paddle?: PaddleGlobal
  }
}

const CLIENT_TOKEN = (import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string | undefined)?.trim() ?? ''
const PADDLE_ENV = (import.meta.env.VITE_PADDLE_ENV as string | undefined)?.trim() ?? ''

/** True when checkout can run (client token configured). */
export const paddleConfigured = CLIENT_TOKEN.length > 0

let loader: Promise<PaddleGlobal> | null = null

/** Load Paddle.js once and initialize it with the client token. */
function loadPaddle(onEvent?: (name: string) => void): Promise<PaddleGlobal> {
  if (!paddleConfigured) return Promise.reject(new Error('paddle-not-configured'))
  loader ??= new Promise<PaddleGlobal>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'
    script.async = true
    script.onload = () => {
      const paddle = window.Paddle
      if (!paddle) return reject(new Error('paddle-load-failed'))
      if (PADDLE_ENV) paddle.Environment?.set(PADDLE_ENV)
      paddle.Initialize({
        token: CLIENT_TOKEN,
        eventCallback: (e) => e.name && onEvent?.(e.name),
      })
      resolve(paddle)
    }
    script.onerror = () => {
      loader = null // allow a retry on the next click
      reject(new Error('paddle-load-failed'))
    }
    document.head.appendChild(script)
  })
  return loader
}

let eventHandler: ((name: string) => void) | undefined

/** Subscribe to Paddle checkout lifecycle events (e.g. `checkout.completed`). */
export function onPaddleEvent(handler: (name: string) => void) {
  eventHandler = handler
}

/**
 * Open Paddle Checkout for a plan price. `userId` is REQUIRED for webhook
 * fulfillment — it maps the payment back to the tenant.
 */
export async function openPaddleCheckout(opts: {
  priceId: string
  email?: string
  userId: string
}): Promise<void> {
  const paddle = await loadPaddle((name) => eventHandler?.(name))
  paddle.Checkout.open({
    items: [{ priceId: opts.priceId, quantity: 1 }],
    customer: opts.email ? { email: opts.email } : undefined,
    customData: { user_id: opts.userId }, // required for fulfillment
  })
}

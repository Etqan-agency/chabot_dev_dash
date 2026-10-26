/**
 * Meta Embedded Signup in the browser: load the Facebook JS SDK, open the
 * WhatsApp signup popup, and collect what it hands back -- a one-time `code`
 * (from FB.login) and the `waba_id` / `phone_number_id` the tenant picked
 * (from a postMessage). The API finishes the connection with those three.
 */

export interface SignupConfig {
  app_id: string
  config_id: string
  graph_version: string
}

export interface SignupResult {
  code: string
  waba_id: string
  phone_number_id: string
}

/** Why the popup didn't produce a number (shown to the tenant). */
export class SignupCancelled extends Error {
  readonly reason: 'cancelled' | 'error' | 'incomplete'

  constructor(message: string, reason: 'cancelled' | 'error' | 'incomplete') {
    super(message)
    this.reason = reason
  }
}

interface FBLoginResponse {
  authResponse?: { code?: string } | null
  status?: string
}

interface FBStatic {
  init: (opts: Record<string, unknown>) => void
  login: (cb: (res: FBLoginResponse) => void, opts: Record<string, unknown>) => void
}

declare global {
  interface Window {
    FB?: FBStatic
    fbAsyncInit?: () => void
  }
}

const SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js'
let sdkPromise: Promise<FBStatic> | null = null
let initedFor = ''

/** Load and init the SDK once. Call it early (on mount): FB.login must run
 * straight from the click, or the browser blocks the popup. */
export function loadFacebookSdk(config: SignupConfig): Promise<FBStatic> {
  if (!sdkPromise) {
    sdkPromise = new Promise<FBStatic>((resolve, reject) => {
      if (window.FB) return resolve(window.FB)
      window.fbAsyncInit = () => (window.FB ? resolve(window.FB) : reject(new Error('FB SDK')))
      const script = document.createElement('script')
      script.src = SDK_SRC
      script.async = true
      script.defer = true
      script.crossOrigin = 'anonymous'
      script.onerror = () => {
        sdkPromise = null
        reject(new Error('Could not load the Facebook SDK (blocked by the browser or an extension?).'))
      }
      document.body.appendChild(script)
    })
  }
  return sdkPromise.then((FB) => {
    if (initedFor !== config.app_id) {
      FB.init({ appId: config.app_id, autoLogAppEvents: true, xfbml: false, version: config.graph_version })
      initedFor = config.app_id
    }
    return FB
  })
}

function isFacebookOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname
    return host === 'facebook.com' || host.endsWith('.facebook.com')
  } catch {
    return false
  }
}

/** Open the popup (call from a click handler, after `loadFacebookSdk`). */
export function launchWhatsAppSignup(FB: FBStatic, config: SignupConfig): Promise<SignupResult> {
  return new Promise<SignupResult>((resolve, reject) => {
    let code = ''
    let ids: { waba_id: string; phone_number_id: string } | null = null
    let done = false
    let waitTimer: number | undefined

    const finish = (fn: () => void) => {
      if (done) return
      done = true
      window.removeEventListener('message', onMessage)
      window.clearTimeout(waitTimer)
      fn()
    }
    const tryResolve = () => {
      if (code && ids) finish(() => resolve({ code, ...ids! }))
    }

    function onMessage(event: MessageEvent) {
      if (!isFacebookOrigin(event.origin)) return
      let data: { type?: string; event?: string; data?: Record<string, string> }
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      } catch {
        return
      }
      if (data?.type !== 'WA_EMBEDDED_SIGNUP') return
      if (data.event?.startsWith('FINISH') && data.data?.phone_number_id && data.data?.waba_id) {
        ids = { waba_id: String(data.data.waba_id), phone_number_id: String(data.data.phone_number_id) }
        tryResolve()
      } else if (data.event === 'CANCEL') {
        finish(() => reject(new SignupCancelled(data.data?.current_step ?? 'cancelled', 'cancelled')))
      } else if (data.event === 'ERROR') {
        finish(() => reject(new SignupCancelled(data.data?.error_message ?? 'error', 'error')))
      }
    }
    window.addEventListener('message', onMessage)

    // The SDK rejects an async callback: keep this one synchronous.
    FB.login(
      (res) => {
        code = res.authResponse?.code ?? ''
        if (!code) {
          finish(() => reject(new SignupCancelled('cancelled', 'cancelled')))
          return
        }
        if (ids) return tryResolve()
        // The ids message can trail the login callback slightly.
        waitTimer = window.setTimeout(
          () => finish(() => reject(new SignupCancelled('no number selected', 'incomplete'))),
          15000,
        )
      },
      {
        config_id: config.config_id,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, featureType: '', sessionInfoVersion: '3' },
      },
    )
  })
}

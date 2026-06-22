import { PostHog } from "posthog-node"

// Lazy PostHog client. No-op until POSTHOG_EVENTS_API_KEY is set in .env, so the
// API boots fine without a key and starts sending the moment the owner adds one.
let _ph: PostHog | null = null
let _init = false
function client(): PostHog | null {
  if (_init) return _ph
  _init = true
  const key = process.env.POSTHOG_EVENTS_API_KEY
  if (!key) { _ph = null; return null }
  try {
    _ph = new PostHog(key, {
      host: process.env.POSTHOG_HOST || "https://eu.i.posthog.com",
      flushAt: 1,
      flushInterval: 4000,
    })
  } catch { _ph = null }
  return _ph
}

/** Fire-and-forget server-side capture. Never throws — must not break the request. */
export function phCapture(distinctId: string, event: string, properties?: Record<string, any>): void {
  try {
    const c = client()
    if (!c) return
    const props: Record<string, any> = {}
    for (const [k, v] of Object.entries(properties || {})) if (v !== null && v !== undefined && v !== "") props[k] = v
    c.capture({ distinctId: distinctId || "anonymous", event, properties: props })
  } catch { /* swallow */ }
}

export function phEnabled(): boolean { return !!process.env.POSTHOG_EVENTS_API_KEY }

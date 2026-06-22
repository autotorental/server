// Cloudflare API helper. Auth stored in app_setting:
//   cloudflare_api_token = a scoped API Token (Bearer)  OR  a Global API Key
//   cloudflare_email     = if set, the saved value is treated as a Global API Key (X-Auth)
// Zone auto-resolved by domain (or cloudflare_zone_id). Never hard-coded.
import { getSetting } from "./settings"

const BASE = "https://api.cloudflare.com/client/v4"
const DOMAIN = "autotorental.com"

// token may be a scoped API Token (Bearer) OR an encoded Global API Key "x-auth:<email>:<key>"
export function cfHeaders(token: string): Record<string, string> {
  if (token && token.startsWith("x-auth:")) {
    const i = token.indexOf(":", 7)
    const email = token.slice(7, i)
    const key = token.slice(i + 1)
    return { "X-Auth-Email": email, "X-Auth-Key": key, "Content-Type": "application/json" }
  }
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
}

export async function cfCall(token: string, path: string, method = "GET", body?: any): Promise<any> {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: cfHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  })
  const j = await r.json().catch(() => ({}))
  if (!j?.success) throw new Error(j?.errors?.[0]?.message || `Cloudflare HTTP ${r.status}`)
  return j.result
}

export async function cfContext(scope: any): Promise<{ token: string; zoneId: string }> {
  const rawToken = (await getSetting(scope, "cloudflare_api_token")) || ""
  if (!rawToken) { const e: any = new Error("Cloudflare API token not configured"); e.code = "NO_TOKEN"; throw e }
  const email = (await getSetting(scope, "cloudflare_email").catch(() => "")) || ""
  const token = email ? `x-auth:${email}:${rawToken}` : rawToken
  let zoneId = (await getSetting(scope, "cloudflare_zone_id").catch(() => "")) || ""
  if (!zoneId) {
    const zones = await cfCall(token, `/zones?name=${encodeURIComponent(DOMAIN)}`)
    zoneId = zones?.[0]?.id || ""
    if (!zoneId) throw new Error(`No Cloudflare zone found for ${DOMAIN}`)
  }
  return { token, zoneId }
}

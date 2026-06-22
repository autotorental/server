import { getSetting } from "./settings"
import { readFileSync } from "fs"
import { join } from "path"
import crypto from "crypto"

// Minimal GA4 Data API client (hand-rolled JWT, no google libs). Mirrors the
// approach already used in /admin/analytics/firebase so it works the same way.
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly"
export const GA4_SA_HINT = "firebase-adminsdk-fbsvc@auto-to-rental.iam.gserviceaccount.com"

const b64 = (b: any) => Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

export async function loadGa4(scope: any): Promise<{ propertyId: string; saJson: string } | null> {
  const propertyId = await getSetting(scope, "ga4_property_id")
  if (!propertyId) return null
  let saJson = (await getSetting(scope, "ga4_service_account_json")) || ""
  if (!saJson) {
    for (const p of [join(process.cwd(), "firebase-service-account.json"), "/opt/autorental/packages/api/firebase-service-account.json"]) {
      try { const txt = readFileSync(p, "utf8"); if (txt) { saJson = txt; break } } catch { /* try next */ }
    }
  }
  if (!saJson) return null
  return { propertyId: String(propertyId), saJson }
}

export async function ga4Token(saJson: string): Promise<string | null> {
  try {
    const sa = JSON.parse(saJson)
    const now = Math.floor(Date.now() / 1000)
    const head = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }))
    const claim = b64(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }))
    const signer = crypto.createSign("RSA-SHA256"); signer.update(head + "." + claim)
    const jwt = head + "." + claim + "." + b64(signer.sign(sa.private_key))
    const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }), signal: AbortSignal.timeout(15000) })
    const j: any = await r.json()
    return j.access_token || null
  } catch { return null }
}

export async function ga4RunReport(propertyId: string, token: string, body: any): Promise<{ status: number; json: any }> {
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, { method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) })
  return { status: r.status, json: await r.json().catch(() => null) }
}

export async function ga4Metadata(propertyId: string, token: string): Promise<{ status: number; json: any }> {
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}/metadata`, { headers: { Authorization: "Bearer " + token }, signal: AbortSignal.timeout(20000) })
  return { status: r.status, json: await r.json().catch(() => null) }
}

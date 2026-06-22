// GET /admin/payments/test — REAL verification of the saved payment keys
// (Mollie /methods, Stripe /v1/account). No fake "connected" — each result
// reflects a live API call.
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getSetting } from "../../../../lib/settings"

async function testMollie(key: string, testmode: boolean) {
  const isAccess = key.startsWith("access_")
  const url = "https://api.mollie.com/v2/methods" + (isAccess && testmode ? "?testmode=true" : "")
  try {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000) })
    const d: any = await r.json().catch(() => ({}))
    if (!r.ok) return { ok: false, message: (d?.detail || d?.title || `HTTP ${r.status}`) }
    const methods = (d?._embedded?.methods || []).map((m: any) => m.description || m.id)
    return { ok: true, message: `Connected ✓ — active methods: ${methods.length ? methods.join(", ") : "none yet (activate in Mollie dashboard)"}` }
  } catch (e: any) { return { ok: false, message: String(e?.message || e).slice(0, 120) } }
}

async function testStripe(key: string) {
  try {
    const r = await fetch("https://api.stripe.com/v1/account", { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000) })
    const d: any = await r.json().catch(() => ({}))
    if (!r.ok) return { ok: false, message: (d?.error?.message || `HTTP ${r.status}`) }
    return { ok: true, message: `Connected ✓ — ${d?.business_profile?.name || d?.email || d?.id} · charges ${d?.charges_enabled ? "enabled" : "disabled"} · ${String(key).startsWith("sk_live") ? "LIVE" : "TEST"}` }
  } catch (e: any) { return { ok: false, message: String(e?.message || e).slice(0, 120) } }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const which = String((req.query as any).provider || "").toLowerCase()
  const mKey = (await getSetting(req.scope, "mollie_api_key").catch(() => "")) || ""
  const sKey = (await getSetting(req.scope, "stripe_secret_key").catch(() => "")) || ""
  const testmode = (await getSetting(req.scope, "mollie_testmode").catch(() => "")) === "true"

  if (which === "mollie") return res.json(mKey ? await testMollie(mKey, testmode) : { ok: false, message: "No Mollie key saved yet." })
  if (which === "stripe") return res.json(sKey ? await testStripe(sKey) : { ok: false, message: "No Stripe key saved yet." })

  res.json({
    mollie: mKey ? await testMollie(mKey, testmode) : { ok: false, message: "not set" },
    stripe: sKey ? await testStripe(sKey) : { ok: false, message: "not set" },
  })
}

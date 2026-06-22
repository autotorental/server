import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getSetting, invalidateSettings } from "../../../lib/settings"

// GET /admin/stripe — connection status (verifies the saved secret key against Stripe)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sk = await getSetting(req.scope, "stripe_secret_key").catch(() => "")
  const pk = await getSetting(req.scope, "stripe_publishable_key").catch(() => "")
  const whsec = await getSetting(req.scope, "stripe_webhook_secret").catch(() => "")
  const provider = ((await getSetting(req.scope, "payment_provider").catch(() => "")) || "").toLowerCase()
  const base = { publishable_set: !!pk, webhook_set: !!whsec, provider, webhook_url: "https://api.autotorental.com/webhooks/stripe" }
  if (!sk) return res.json({ connected: false, ...base })
  try {
    const acct: any = await fetch("https://api.stripe.com/v1/account", { headers: { Authorization: `Bearer ${sk}` }, signal: AbortSignal.timeout(15000) }).then((r) => r.json())
    if (acct.error) return res.json({ connected: true, ok: false, error: acct.error.message, ...base })
    return res.json({
      connected: true, ok: true, ...base,
      account: {
        id: acct.id,
        name: acct.business_profile?.name || acct.settings?.dashboard?.display_name || acct.email || acct.id,
        country: acct.country,
        charges_enabled: !!acct.charges_enabled,
        mode: String(sk).startsWith("sk_live") ? "live" : "test",
      },
    })
  } catch (e: any) {
    return res.json({ connected: true, ok: false, error: e?.message || "Stripe error", ...base })
  }
}

// POST /admin/stripe — owner pastes Stripe keys (secrets); optionally activate Stripe as provider
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const b: any = req.body || {}
  const upsert = async (key: string, value: string, secret: boolean) => {
    const ex = await pg("app_setting").where({ key }).first()
    if (ex) await pg("app_setting").where({ key }).update({ value, is_secret: secret, updated_at: new Date() })
    else await pg("app_setting").insert({ key, value, is_secret: secret, updated_at: new Date() })
  }
  if (typeof b.stripe_secret_key === "string" && b.stripe_secret_key.trim()) await upsert("stripe_secret_key", b.stripe_secret_key.trim(), true)
  if (typeof b.stripe_publishable_key === "string" && b.stripe_publishable_key.trim()) await upsert("stripe_publishable_key", b.stripe_publishable_key.trim(), false)
  if (typeof b.stripe_webhook_secret === "string" && b.stripe_webhook_secret.trim()) await upsert("stripe_webhook_secret", b.stripe_webhook_secret.trim(), true)
  if (b.activate) await upsert("payment_provider", "stripe", false)
  if (b.provider === "demo" || b.provider === "mollie") await upsert("payment_provider", b.provider, false)
  invalidateSettings()
  res.json({ ok: true })
}

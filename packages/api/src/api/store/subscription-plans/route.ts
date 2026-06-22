// GET /store/subscription-plans — vendor subscription pricing + features, driven by
// editable app_setting keys so the OWNER can change prices AND feature lists from the
// dashboard WITHOUT a new app build. Keys (AED): sub_basic_monthly, sub_basic_yearly,
// sub_plus_monthly, sub_plus_yearly, sub_currency, sub_basic_features (JSON string[]),
// sub_plus_features (JSON string[] — Plus's extra/AI features). The price set here is
// exactly what Stripe charges (the PaymentSheet reads the same keys).
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getSetting } from "../../../lib/settings"

const DEFAULTS = { basic_monthly: 99, basic_yearly: 990, plus_monthly: 150, plus_yearly: 1500 }

async function num(req: MedusaRequest, key: string, def: number): Promise<number> {
  const raw = (await getSetting(req.scope, key).catch(() => "")) || ""
  const n = Number(raw)
  return raw !== "" && Number.isFinite(n) && n > 0 ? n : def
}

async function features(req: MedusaRequest, key: string): Promise<string[]> {
  const raw = (await getSetting(req.scope, key).catch(() => "")) || ""
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 20)
  } catch { return [] }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const [bm, by, pm, py, bf, pf] = await Promise.all([
    num(req, "sub_basic_monthly", DEFAULTS.basic_monthly),
    num(req, "sub_basic_yearly", DEFAULTS.basic_yearly),
    num(req, "sub_plus_monthly", DEFAULTS.plus_monthly),
    num(req, "sub_plus_yearly", DEFAULTS.plus_yearly),
    features(req, "sub_basic_features"),
    features(req, "sub_plus_features"),
  ])
  const currency = ((await getSetting(req.scope, "sub_currency").catch(() => "")) || "AED").toUpperCase()
  res.json({
    currency,
    plans: {
      basic: { monthly: bm, yearly: by },
      plus: { monthly: pm, yearly: py },
    },
    features: { basic: bf, plus: pf },
  })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const KEY = "finance_config"
const DEFAULTS = {
  currency: "USD",
  server_cost: 40,
  ai_cost: 0,
  other_cost: 15,
  price_per_sub: 150,
  subscribers_override: null as number | null,
  growth_per_month: 3,
}

async function getJson(pg: any, key: string) {
  try { const r = await pg("app_setting").where({ key }).first(); return r?.value ? JSON.parse(r.value) : null } catch { return null }
}

// GET /admin/finance — saved cost/price config + REAL live counts.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const saved = (await getJson(pg, KEY)) || {}
  const cfg = { ...DEFAULTS, ...saved }
  const q = (sql: string) => pg.raw(sql).then((r: any) => r.rows?.[0]?.n ?? 0)
  const [vendors, activeSubs, trialSubs, customers] = await Promise.all([
    q("SELECT count(*) AS n FROM seller WHERE deleted_at IS NULL"),
    q("SELECT count(*) AS n FROM seller WHERE deleted_at IS NULL AND subscription_status='active'"),
    q("SELECT count(*) AS n FROM seller WHERE deleted_at IS NULL AND subscription_status='trial'"),
    q("SELECT count(*) AS n FROM customer WHERE deleted_at IS NULL"),
  ])
  res.json({ config: cfg, live: { vendors: Number(vendors), active_subscribers: Number(activeSubs), trial_subscribers: Number(trialSubs), customers: Number(customers) } })
}

// POST /admin/finance — save the cost/price assumptions.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const b = (req.body || {}) as any
  const clean: any = {}
  for (const k of ["currency", "server_cost", "ai_cost", "other_cost", "price_per_sub", "subscribers_override", "growth_per_month"]) {
    if (b[k] !== undefined) clean[k] = b[k]
  }
  const existing = (await getJson(pg, KEY)) || {}
  const merged = { ...existing, ...clean }
  await pg("app_setting").insert({ key: KEY, value: JSON.stringify(merged) }).onConflict("key").merge({ value: JSON.stringify(merged) })
  res.json({ ok: true, config: merged })
}

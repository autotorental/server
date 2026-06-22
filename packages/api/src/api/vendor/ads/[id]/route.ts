import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveVendorSellerId } from "../../../../lib/vendor-seller"

function ser(c: any) {
  let platforms: any[] = []
  try { platforms = typeof c.platforms === "string" ? JSON.parse(c.platforms) : (c.platforms || []) } catch {}
  return { ...c, platforms, budget: Number(c.budget_cents) / 100, spend: Number(c.spend_cents) / 100,
    impressions: Number(c.impressions), clicks: Number(c.clicks), reach: Number(c.reach), leads: Number(c.leads),
    commission_pct: Number(c.commission_pct) }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "unauthenticated" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const c = await pg("ad_campaign").where({ id: (req.params as any).id, seller_id: sellerId }).first()
  if (!c) return res.status(404).json({ message: "Not found" })
  res.json({ campaign: ser(c) })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "unauthenticated" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const action = String((req.body as any)?.action || "")
  const c = await pg("ad_campaign").where({ id: (req.params as any).id, seller_id: sellerId }).first()
  if (!c) return res.status(404).json({ message: "Not found" })
  let status = c.status
  if (action === "pause" && c.status === "active") status = "paused"
  else if (action === "resume" && c.status === "paused") status = "active"
  else return res.status(400).json({ message: "Invalid action for current status" })
  await pg("ad_campaign").where({ id: c.id }).update({ status, updated_at: pg.fn.now() })
  res.json({ campaign: ser({ ...c, status }) })
}

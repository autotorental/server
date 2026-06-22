import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// POST /store/ads/:id/track  { event: "impression" | "click" }
// Real engagement counters from native in-app placements -> feeds the vendor's
// Meta-like dashboard (impressions / clicks) and the admin Ads Manager.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const id = (req.params as any).id
  const event = String((req.body as any)?.event || "")
  const col = event === "click" ? "clicks" : event === "impression" ? "impressions" : null
  if (!col) return res.status(400).json({ message: "event must be impression|click" })
  try {
    const n = await pg("ad_campaign").where({ id, status: "active" }).increment(col, 1)
    return res.json({ ok: n > 0 })
  } catch (e: any) {
    return res.status(500).json({ ok: false })
  }
}

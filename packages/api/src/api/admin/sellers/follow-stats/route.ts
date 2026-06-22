import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /admin/sellers/follow-stats — follower counts for ALL sellers in ONE
// grouped query (replaces the per-seller N+1 the sellers list page used to do).
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  try {
    const rows = await pg("seller_follow")
      .whereNull("deleted_at")
      .select("seller_id")
      .count("* as total")
      .groupBy("seller_id")
    const stats: Record<string, number> = {}
    for (const r of rows) stats[r.seller_id] = parseInt(r.total, 10) || 0
    res.json({ stats })
  } catch {
    res.json({ stats: {} })
  }
}

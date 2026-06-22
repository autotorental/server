// GET /admin/social-log?limit=50
// Returns recent social media posting attempts (successes + failures).
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const limit = Math.min(parseInt((req.query.limit as string) || "50", 10), 200)
  const rows = await pg("social_post_log as l")
    .leftJoin("vehicle as v", "v.id", "l.vehicle_id")
    .leftJoin("seller as s", "s.id", "l.seller_id")
    .select(
      "l.*",
      "v.title as vehicle_title",
      "v.photos as vehicle_photos",
      "s.name as seller_name",
      "s.handle as seller_handle",
    )
    .orderBy("l.created_at", "desc")
    .limit(limit)
  res.json({ logs: rows, count: rows.length })
}

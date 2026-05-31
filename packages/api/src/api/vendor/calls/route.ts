import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

function getSellerId(req: MedusaRequest): string | null {
  const auth = (req as any).auth_context
  return auth?.app_metadata?.seller_id || auth?.actor_id || null
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = getSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "Unauthorized" })

  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const offset = Number(req.query.offset) || 0
  const status = req.query.status ? String(req.query.status) : null
  const direction = req.query.direction ? String(req.query.direction) : null

  const base = () => {
    let q = pg("vendor_call as vc")
      .leftJoin("vehicle as v", "v.id", "vc.vehicle_id")
      .where("vc.seller_id", sellerId)
    if (status) q = q.where("vc.status", status)
    if (direction) q = q.where("vc.direction", direction)
    return q
  }

  const rows = await base()
    .orderBy("vc.created_at", "desc")
    .limit(limit)
    .offset(offset)
    .select(
      "vc.id",
      "vc.status",
      "vc.direction",
      "vc.client_name",
      "vc.client_phone",
      "vc.client_country",
      "vc.created_at",
      "v.title as vehicle_title"
    )

  const countRow = await base().count("vc.id as c").first()

  // Recording files are intentionally NOT exposed to vendors — only admins can
  // access call recordings.
  res.json({
    calls: rows,
    count: Number((countRow as any)?.c || 0),
    limit,
    offset,
  })
}

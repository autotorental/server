import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CATALOG_MODULE } from "../../../modules/catalog"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const q = req.query as any
  const filters: any = {}
  if (q.seller_id) filters.seller_id = q.seller_id
  if (q.status) filters.status = q.status
  if (q.brand_id) filters.brand_id = q.brand_id
  if (q.city_id) filters.city_id = q.city_id
  const vehicles = await svc.listVehicles(filters, { order: { created_at: "DESC" } })
  res.json({ vehicles })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CATALOG_MODULE } from "../../../../modules/catalog"
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const brand_id = req.query.brand_id as string | undefined
  const filters: any = { is_active: true }
  if (brand_id) filters.brand_id = brand_id
  const models = await svc.listCarModels(filters, { order: { sort_order: "ASC", name: "ASC" } })
  res.json({ models })
}

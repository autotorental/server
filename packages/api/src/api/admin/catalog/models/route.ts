import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CATALOG_MODULE } from "../../../../modules/catalog"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const brand_id = req.query.brand_id as string | undefined
  const filters: any = {}
  if (brand_id) filters.brand_id = brand_id
  const models = await svc.listCarModels(filters, { order: { sort_order: "ASC", name: "ASC" } })
  res.json({ models })
}
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const body = req.body as any
  if (!body?.brand_id || !body?.name || !body?.slug) return res.status(400).json({ message: "brand_id, name, slug required" })
  const [m] = await svc.createCarModels([body])
  res.status(201).json({ model: m })
}

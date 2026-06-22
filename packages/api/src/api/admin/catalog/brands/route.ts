import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CATALOG_MODULE } from "../../../../modules/catalog"
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const brands = await svc.listBrands({}, { order: { sort_order: "ASC", name: "ASC" } })
  res.json({ brands })
}
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const body = req.body as any
  if (!body?.name || !body?.slug) return res.status(400).json({ message: "name & slug required" })
  const [brand] = await svc.createBrands([body])
  res.status(201).json({ brand })
}

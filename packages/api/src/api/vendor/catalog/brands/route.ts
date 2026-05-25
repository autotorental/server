import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CATALOG_MODULE } from "../../../../modules/catalog"
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const brands = await svc.listBrands({ is_active: true }, { order: { sort_order: "ASC", name: "ASC" } })
  res.json({ brands })
}

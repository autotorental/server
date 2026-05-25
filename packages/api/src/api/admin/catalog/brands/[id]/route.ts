import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CATALOG_MODULE } from "../../../../../modules/catalog"
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  await svc.deleteBrands([req.params.id])
  res.json({ id: req.params.id, deleted: true })
}
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const [brand] = await svc.updateBrands([{ id: req.params.id, ...(req.body as any) }])
  res.json({ brand })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CATALOG_MODULE } from "../../../../../modules/catalog"
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  await svc.deleteCarModels([req.params.id])
  res.json({ id: req.params.id, deleted: true })
}
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const body = req.body as any; delete body.id
  const [m] = await svc.updateCarModels([{ id: req.params.id, ...body }])
  res.json({ model: m })
}

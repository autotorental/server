import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CATALOG_MODULE } from "../../../../modules/catalog"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const v = await svc.retrieveVehicle(req.params.id).catch(() => null)
  if (!v) return res.status(404).json({ message: "Not found" })
  res.json({ vehicle: v })
}
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const body = req.body as any; delete body.id
  const [updated] = await svc.updateVehicles([{ id: req.params.id, ...body }])
  res.json({ vehicle: updated })
}
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  await svc.deleteVehicles([req.params.id])
  res.json({ id: req.params.id, deleted: true })
}

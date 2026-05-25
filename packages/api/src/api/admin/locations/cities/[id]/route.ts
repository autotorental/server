import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LOCATIONS_MODULE } from "../../../../../modules/locations"

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(LOCATIONS_MODULE)
  await svc.deleteCities([req.params.id])
  res.json({ id: req.params.id, deleted: true })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(LOCATIONS_MODULE)
  const body = req.body as any
  const [city] = await svc.updateCities([{ id: req.params.id, ...body }])
  res.json({ city })
}

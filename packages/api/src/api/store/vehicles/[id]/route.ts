import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CATALOG_MODULE } from "../../../../modules/catalog"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const v = await svc.retrieveVehicle(req.params.id).catch(() => null)
  if (!v || v.status !== "active") return res.status(404).json({ message: "Not found" })
  // increment view count
  await svc.updateVehicles([{ id: v.id, view_count: (v.view_count || 0) + 1 }]).catch(() => {})
  res.json({ vehicle: v })
}

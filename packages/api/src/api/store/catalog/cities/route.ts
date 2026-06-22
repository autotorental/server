import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LOCATIONS_MODULE } from "../../../../modules/locations"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(LOCATIONS_MODULE)
  const cities = await svc.listCities(
    { is_active: true },
    { order: { country_code: "ASC", sort_order: "ASC", name: "ASC" } }
  )
  res.json({ cities })
}

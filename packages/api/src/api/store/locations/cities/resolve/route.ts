import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { findOrCreateCity } from "../../../../../lib/city-resolve"

// POST /store/locations/cities/resolve  { name, country_code, name_ar? }
// Lets a vendor (listing a car) or client pick any city worldwide; if it isn't
// in the catalog yet it is created automatically and shows up in the admin.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const b = (req.body || {}) as any
  const city = await findOrCreateCity(pg, { name: b.name, country_code: b.country_code, name_ar: b.name_ar })
  if (!city) return res.status(400).json({ message: "Valid name and 2-letter country_code required" })
  res.json({ city })
}

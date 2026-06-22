// POST /admin/vehicles/:id/repost — manually re-share an existing vehicle to all configured socials.
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CATALOG_MODULE } from "../../../../../modules/catalog"
import { LOCATIONS_MODULE } from "../../../../../modules/locations"
import { postAndLog } from "../../../../../lib/social-post-log"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const locSvc: any = req.scope.resolve(LOCATIONS_MODULE)
  const v = await svc.retrieveVehicle(req.params.id).catch(() => null)
  if (!v) return res.status(404).json({ message: "Vehicle not found" })

  let brand_name: string | null = null
  let model_name: string | null = null
  let city_name: string | null = null
  try {
    if (v.brand_id) { const [b] = await svc.listBrands({ id: v.brand_id }); brand_name = b?.name || null }
    if (v.model_id) { const [m] = await svc.listCarModels({ id: v.model_id }); model_name = m?.name || null }
    if (v.city_id) { const [c] = await locSvc.listCities({ id: v.city_id }); city_name = c?.name || null }
  } catch {}

  const slug = (v.title || v.id).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
  const results = await postAndLog(req.scope, {
    id: v.id, title: v.title, description: v.description,
    daily_price: v.daily_price, currency_code: v.currency_code,
    photos: v.photos || [], slug,
    city_name, brand_name, model_name,
    seller_id: v.seller_id,
  }, "manual")
  res.json({ vehicle_id: v.id, results })
}

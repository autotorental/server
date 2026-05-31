import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CATALOG_MODULE } from "../../../modules/catalog"
import { normalizeVehicleMedia } from "../../../lib/vehicle-media"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const q = req.query as any
  const filters: any = {}
  if (q.seller_id) filters.seller_id = q.seller_id
  if (q.status) filters.status = q.status
  if (q.brand_id) filters.brand_id = q.brand_id
  if (q.city_id) filters.city_id = q.city_id
  const vehicles = await svc.listVehicles(filters, { order: { created_at: "DESC" } })
  res.json({ vehicles })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = req.body as any
  try {
    normalizeVehicleMedia(body)
  } catch (e: any) {
    return res.status(400).json({ message: e?.message || "Invalid media payload" })
  }

  if (!body?.seller_id || !body?.title?.trim() || !body?.brand_id || !body?.city_id) {
    return res.status(400).json({ message: "seller_id, title, brand_id, city_id required" })
  }

  const seller = await pg("seller").where({ id: body.seller_id }).first()
  if (!seller) return res.status(404).json({ message: "Rental company not found" })

  const allowed = ["draft", "pending_approval", "active", "paused"]
  const status = allowed.includes(body.status) ? body.status : "pending_approval"

  const payload: any = {
    seller_id: body.seller_id,
    title: body.title.trim(),
    description: body.description?.trim() || null,
    brand_id: body.brand_id,
    model_id: body.model_id || null,
    body_type_id: body.body_type_id || null,
    city_id: body.city_id,
    year: body.year ? parseInt(body.year, 10) : null,
    mileage_km: body.mileage_km ? parseInt(body.mileage_km, 10) : null,
    color: body.color?.trim() || null,
    fuel_type: body.fuel_type || null,
    transmission: body.transmission || null,
    seats: body.seats ? parseInt(body.seats, 10) : null,
    doors: body.doors ? parseInt(body.doors, 10) : null,
    currency_code: (body.currency_code || "aed").toLowerCase(),
    daily_price: body.daily_price != null && body.daily_price !== "" ? Number(body.daily_price) : null,
    weekly_price: body.weekly_price != null && body.weekly_price !== "" ? Number(body.weekly_price) : null,
    monthly_price: body.monthly_price != null && body.monthly_price !== "" ? Number(body.monthly_price) : null,
    phone_number: body.phone_number?.trim() || seller.company_phone || null,
    whatsapp_number: body.whatsapp_number?.trim() || seller.company_whatsapp || seller.company_phone || null,
    livekit_enabled: !!body.livekit_enabled,
    photos: Array.isArray(body.photos) ? body.photos : [],
    videos: Array.isArray(body.videos) ? body.videos : [],
    feature_ids: Array.isArray(body.feature_ids) ? body.feature_ids : [],
    status,
    rejection_reason: null,
    rejection_note: null,
    approved_at: status === "active" ? new Date() : null,
    rejected_at: null,
  }

  const [vehicle] = await svc.createVehicles([payload])
  res.status(201).json({ vehicle })
}

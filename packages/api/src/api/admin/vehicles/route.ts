import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CATALOG_MODULE } from "../../../modules/catalog"
import { normalizeVehicleMedia } from "../../../lib/vehicle-media"

// Optimize Contentful image URLs for thumbnail display — 4MB → ~30KB per thumb.
function thumbify(url: string | null | undefined): string {
  if (!url) return ""
  try {
    const u = new URL(url)
    if (u.hostname.includes("ctfassets.net")) {
      u.searchParams.set("w", "120")
      u.searchParams.set("h", "80")
      u.searchParams.set("fm", "webp")
      u.searchParams.set("q", "60")
      u.searchParams.set("fit", "fill")
      return u.toString()
    }
  } catch { /* ignore */ }
  return url
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const q = req.query as any
  const limit = Math.min(200, Number(q.limit) || 50)
  const offset = Number(q.offset) || 0
  const filters: any = {}
  if (q.seller_id) filters.seller_id = q.seller_id
  if (q.status) filters.status = q.status
  if (q.brand_id) filters.brand_id = q.brand_id
  if (q.city_id) filters.city_id = q.city_id
  const search = String(q.q || "").trim()
  // Use raw pg for pagination + total count — much faster than Medusa module for large lists
  try {
    const base = pg("vehicle as v")
      .leftJoin("seller as s", "s.id", "v.seller_id")
      .leftJoin("brand as b", "b.id", "v.brand_id")
      .leftJoin("city as c", "c.id", "v.city_id")
      .whereNull("v.deleted_at")
    if (filters.seller_id) base.where("v.seller_id", filters.seller_id)
    if (filters.status) base.where("v.status", filters.status)
    if (filters.brand_id) base.where("v.brand_id", filters.brand_id)
    if (filters.city_id) base.where("v.city_id", filters.city_id)
    if (search) base.where((qb: any) => {
      qb.whereRaw("LOWER(v.title) like ?", [`%${search.toLowerCase()}%`])
        .orWhereRaw("LOWER(COALESCE(b.name,'')) like ?", [`%${search.toLowerCase()}%`])
        .orWhereRaw("LOWER(COALESCE(s.name,'')) like ?", [`%${search.toLowerCase()}%`])
    })
    const [{ total }] = await base.clone().count("v.id as total")
    const rows = await base.clone()
      .select(
        "v.id", "v.title", "v.status", "v.daily_price", "v.currency_code",
        "v.photos", "v.year", "v.slug", "v.created_at", "v.updated_at",
        "v.brand_id", "v.city_id", "v.seller_id",
        "s.name as seller_name", "s.handle as seller_handle",
        "b.name as brand_name",
        "c.name as city_name"
      )
      .orderBy("v.created_at", "desc")
      .limit(limit).offset(offset)
    const vehicles = rows.map((r: any) => {
      const photos = (() => { try { return Array.isArray(r.photos) ? r.photos : JSON.parse(r.photos || "[]") } catch { return [] } })()
      return {
        ...r,
        photos,
        // Thumbnail-optimised first photo for fast list rendering
        thumbnail: thumbify(photos[0] || null),
        seller: { id: r.seller_id, name: r.seller_name, handle: r.seller_handle },
        brand: { id: r.brand_id, name: r.brand_name },
        city: { id: r.city_id, name: r.city_name },
      }
    })
    return res.json({ vehicles, count: Number(total), offset, limit })
  } catch (e: any) {
    // Fallback to Medusa module (no pagination)
    const vehicles = await svc.listVehicles(filters, { order: { created_at: "DESC" } })
    return res.json({ vehicles, count: vehicles.length })
  }
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
    vin: body.vin ? String(body.vin).trim().toUpperCase() || null : null,
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
    livekit_enabled: body.livekit_enabled !== false, // Default: true
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

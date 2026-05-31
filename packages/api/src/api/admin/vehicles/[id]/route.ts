import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CATALOG_MODULE } from "../../../../modules/catalog"
import { removeVehicleFromSearch, syncVehicleToSearch } from "../../../../lib/vehicle-meili"
import { normalizeVehicleMedia } from "../../../../lib/vehicle-media"

const ALLOWED_STATUSES = new Set([
  "draft",
  "pending_approval",
  "active",
  "paused",
  "rented",
  "unavailable",
  "rejected",
])

const toOptionalNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

const toOptionalInt = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null
  const num = Number.parseInt(String(value), 10)
  return Number.isFinite(num) ? num : null
}

const normalizeFeatureIds = (value: unknown, fallback: unknown) => {
  const source = Array.isArray(value) ? value : Array.isArray(fallback) ? fallback : []
  return Array.from(new Set(source.map((id) => String(id || "").trim()).filter(Boolean)))
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const v = await svc.retrieveVehicle(req.params.id).catch(() => null)
  if (!v) return res.status(404).json({ message: "Not found" })
  res.json({ vehicle: v })
}
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const existing = await svc.retrieveVehicle(req.params.id).catch(() => null)
  if (!existing) return res.status(404).json({ message: "Not found" })

  const body = req.body as any

  const title = typeof body?.title === "string" ? body.title.trim() : null
  if (!title) {
    return res.status(400).json({ message: "title is required" })
  }
  if (!body?.brand_id || !body?.city_id) {
    return res.status(400).json({ message: "brand_id and city_id are required" })
  }

  const status = typeof body?.status === "string" && ALLOWED_STATUSES.has(body.status) ? body.status : existing.status
  const sellerId = typeof body?.seller_id === "string" ? body.seller_id.trim() : existing.seller_id
  if (!sellerId) {
    return res.status(400).json({ message: "seller_id is required" })
  }
  if (sellerId !== existing.seller_id) {
    const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const seller = await pg("seller").where({ id: sellerId }).first()
    if (!seller) return res.status(400).json({ message: "Rental company not found" })
  }

  const next: any = {
    id: req.params.id,
    seller_id: sellerId,
    title,
    description: typeof body?.description === "string"
      ? body.description.trim() || null
      : (existing.description ?? null),
    brand_id: body.brand_id,
    model_id: body.model_id || null,
    body_type_id: body.body_type_id || null,
    city_id: body.city_id,
    year: toOptionalInt(body.year),
    mileage_km: toOptionalInt(body.mileage_km),
    color: typeof body?.color === "string" ? body.color.trim() || null : (existing.color ?? null),
    fuel_type: body.fuel_type || null,
    transmission: body.transmission || null,
    seats: toOptionalInt(body.seats),
    doors: toOptionalInt(body.doors),
    currency_code: String(body?.currency_code || existing.currency_code || "aed").toLowerCase(),
    daily_price: toOptionalNumber(body.daily_price),
    weekly_price: toOptionalNumber(body.weekly_price),
    monthly_price: toOptionalNumber(body.monthly_price),
    phone_number: typeof body?.phone_number === "string" ? body.phone_number.trim() || null : (existing.phone_number ?? null),
    whatsapp_number: typeof body?.whatsapp_number === "string" ? body.whatsapp_number.trim() || null : (existing.whatsapp_number ?? null),
    livekit_enabled: typeof body?.livekit_enabled === "boolean" ? body.livekit_enabled : !!existing.livekit_enabled,
    feature_ids: normalizeFeatureIds(body?.feature_ids, existing?.feature_ids),
    status,
  }
  next.photos = Array.isArray(body?.photos) ? body.photos : (existing.photos || [])
  next.videos = Array.isArray(body?.videos) ? body.videos : (existing.videos || [])

  if (status === "active") {
    next.approved_at = existing.approved_at || new Date()
    next.rejected_at = null
    next.rejection_reason = null
    next.rejection_note = null
  } else if (status !== "rejected") {
    next.rejected_at = null
    next.rejection_reason = null
    next.rejection_note = null
  }

  try {
    normalizeVehicleMedia(next)
  } catch (e: any) {
    return res.status(400).json({ message: e?.message || "Invalid media payload" })
  }
  const [updated] = await svc.updateVehicles([next])
  try { await syncVehicleToSearch(req.scope, updated) } catch { /* optional */ }
  res.json({ vehicle: updated })
}
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const id = req.params.id
  try { await removeVehicleFromSearch(id) } catch { /* optional */ }
  await svc.deleteVehicles([id])
  res.json({ id, deleted: true })
}

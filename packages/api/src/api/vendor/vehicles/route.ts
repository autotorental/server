import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CATALOG_MODULE } from "../../../modules/catalog"

function getSellerId(req: MedusaRequest): string | null {
  const auth = (req as any).auth_context
  return auth?.app_metadata?.seller_id || auth?.actor_id || null
}

async function loadSeller(req: MedusaRequest, sellerId: string) {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const rows = await pg("seller").where({ id: sellerId }).select("*")
  return rows[0] || null
}

function licenseOK(seller: any): boolean {
  if (!seller) return false
  if (!seller.trade_license_verified) return false
  if (seller.trade_license_expiry) {
    const exp = new Date(seller.trade_license_expiry)
    if (exp < new Date()) return false
  }
  return true
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = getSellerId(req); if (!sellerId) return res.status(401).json({ message: "Unauthorized" })
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const vehicles = await svc.listVehicles({ seller_id: sellerId }, { order: { created_at: "DESC" } })
  res.json({ vehicles })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = getSellerId(req); if (!sellerId) return res.status(401).json({ message: "Unauthorized" })
  const seller = await loadSeller(req, sellerId)
  if (!seller) return res.status(404).json({ message: "Seller not found" })

  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const body = req.body as any

  // Auto-fill city + contact from seller defaults if not provided
  if (!body.city_id && seller.default_city_id) body.city_id = seller.default_city_id
  if (!body.phone_number && seller.company_phone) body.phone_number = seller.company_phone
  if (!body.whatsapp_number && seller.company_whatsapp) body.whatsapp_number = seller.company_whatsapp

  if (!body?.title || !body?.brand_id || !body?.city_id) {
    return res.status(400).json({
      message: "title, brand_id, city_id required",
      hint: !body?.city_id ? "Set a default city in Company Profile, or pick one for this vehicle" : undefined,
    })
  }

  // License gate — if not verified or expired, force draft and tell the user
  const canGoLive = licenseOK(seller)
  if (!canGoLive) {
    body.status = "draft"
  } else {
    body.status = "pending_approval"
  }

  body.rejection_reason = null
  body.rejection_note = null
  body.approved_at = null
  body.rejected_at = null

  const [vehicle] = await svc.createVehicles([{ ...body, seller_id: sellerId }])
  res.status(201).json({
    vehicle,
    license_status: canGoLive ? "ok" : "missing_or_expired",
    notice: canGoLive ? null : "Saved as draft. Upload a valid Trade License in Company Profile to publish your listings.",
  })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

function getSellerId(req: MedusaRequest): string | null {
  const auth = (req as any).auth_context
  return auth?.app_metadata?.seller_id || auth?.actor_id || null
}

const ALLOWED = new Set([
  "name","handle","description","email","photo",
  "company_phone","company_whatsapp","company_address",
  "company_location_lat","company_location_lng",
  "default_city_id",
  "trade_license_number","trade_license_url","trade_license_expiry",
])

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sid = getSellerId(req); if (!sid) return res.status(401).json({ message: "Unauthorized" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const rows = await pg("seller").where({ id: sid }).select("*")
  if (!rows.length) return res.status(404).json({ message: "Seller not found" })
  res.json({ seller: rows[0] })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const sid = getSellerId(req); if (!sid) return res.status(401).json({ message: "Unauthorized" })
  const body = req.body as Record<string, any>
  const update: Record<string, any> = {}
  for (const k of Object.keys(body || {})) {
    if (ALLOWED.has(k)) update[k] = body[k]
  }
  // If a seller updates trade-license fields, reset verification — admin must re-approve
  if (update.trade_license_url || update.trade_license_number || update.trade_license_expiry) {
    update.trade_license_verified = false
    update.trade_license_verified_at = null
    update.trade_license_rejection_reason = null
  }
  update.updated_at = new Date()
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  await pg("seller").where({ id: sid }).update(update)
  const rows = await pg("seller").where({ id: sid }).select("*")
  res.json({ seller: rows[0] })
}

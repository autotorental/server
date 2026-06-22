import { revalidateSellerPages } from "../../../lib/storefront-revalidate"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

function getSellerId(req: MedusaRequest): string | null {
  const auth = (req as any).auth_context
  return auth?.app_metadata?.seller_id || auth?.actor_id || null
}

const ALLOWED = new Set([
  "name","handle","description","email",
  "logo","banner","website_url",
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
  // Fire-and-forget: only revalidates this seller's pages
  void revalidateSellerPages(sid, rows[0]?.handle)
  res.json({ seller: rows[0] })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const sid = getSellerId(req); if (!sid) return res.status(401).json({ message: "Unauthorized" })
  const body = req.body as Record<string, any>
  const update: Record<string, any> = {}
  for (const k of Object.keys(body || {})) {
    if (ALLOWED.has(k)) update[k] = body[k]
  }
  // FAQs: sanitize array of { question, answer } and store as jsonb.
  if (Array.isArray((body as any).faqs)) {
    const faqs = ((body as any).faqs as any[])
      .map((f) => ({
        question: String(f?.question || "").trim().slice(0, 300),
        answer: String(f?.answer || "").trim().slice(0, 2000),
      }))
      .filter((f) => f.question && f.answer)
      .slice(0, 20)
    update.faqs = JSON.stringify(faqs)
  }
  // Empty strings are not valid for nullable date/reference columns — coerce to NULL.
  for (const k of ["trade_license_expiry", "default_city_id"]) {
    if (update[k] === "") update[k] = null
  }
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  // Merge metadata jsonb so store-facing fields (location, city) stay visible.
  if (body && typeof body.metadata === "object" && body.metadata) {
    const existingRows = await pg("seller").where({ id: sid }).select("metadata")
    const existing = (existingRows[0]?.metadata as Record<string, any>) || {}
    update.metadata = { ...existing, ...body.metadata }
  }

  // If a seller updates trade-license fields, reset verification — admin must re-approve
  if (update.trade_license_url || update.trade_license_number || update.trade_license_expiry) {
    update.trade_license_verified = false
    update.trade_license_verified_at = null
    update.trade_license_rejection_reason = null
  }
  update.updated_at = new Date()
  await pg("seller").where({ id: sid }).update(update)
  const rows = await pg("seller").where({ id: sid }).select("*")
  // Fire-and-forget: only revalidates this seller's pages
  void revalidateSellerPages(sid, rows[0]?.handle)
  res.json({ seller: rows[0] })
}

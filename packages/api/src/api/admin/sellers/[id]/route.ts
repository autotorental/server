import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveSellerByParam } from "../../../../lib/resolve-seller"

const ALLOWED = new Set([
  "name", "handle", "description", "email", "phone",
  "company_phone", "company_whatsapp", "company_address",
  "logo", "banner", "website_url", "status", "is_premium",
  "default_city_id",
])

// GET /admin/sellers/:id — id or handle (e.g. apple, nst-car-rental)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const row = await resolveSellerByParam(pg, req.params.id)
  if (!row) return res.status(404).json({ message: "Seller not found" })
  res.json({ seller: row })
}

// POST /admin/sellers/:id — update rental company profile (admin)
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const seller = await resolveSellerByParam(pg, req.params.id)
  if (!seller) return res.status(404).json({ message: "Seller not found" })

  const body = (req.body || {}) as Record<string, any>
  const update: Record<string, any> = {}
  for (const k of Object.keys(body)) {
    if (!ALLOWED.has(k)) continue
    if (k === "is_premium") {
      update.is_premium = !!body[k]
    } else if (body[k] === "" || body[k] === null) {
      update[k] = null
    } else {
      update[k] = body[k]
    }
  }

  if (update.handle) {
    const handle = String(update.handle).trim().replace(/^\/+/, "")
    if (!handle) return res.status(400).json({ message: "Handle cannot be empty" })
    const clash = await pg("seller")
      .whereRaw("lower(handle) = lower(?)", [handle])
      .whereNot({ id: seller.id })
      .first()
    if (clash) return res.status(409).json({ message: "Handle already in use" })
    update.handle = handle
  }

  if (update.email) {
    const email = String(update.email).trim().toLowerCase()
    if (!email.includes("@")) return res.status(400).json({ message: "Invalid email" })
    update.email = email
  }

  if (!Object.keys(update).length) {
    return res.status(400).json({ message: "No valid fields to update" })
  }

  update.updated_at = new Date()
  await pg("seller").where({ id: seller.id }).update(update)
  const row = await pg("seller").where({ id: seller.id }).first()
  res.json({ seller: row })
}

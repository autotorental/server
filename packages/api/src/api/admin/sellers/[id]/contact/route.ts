import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveSellerByParam } from "../../../../../lib/resolve-seller"

const ALLOWED = new Set([
  "company_phone",
  "company_whatsapp",
  "company_address",
  "default_city_id",
])

// POST /admin/sellers/:id/contact — update rental-company contact fields (outside Mercur validator)
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const seller = await resolveSellerByParam(pg, req.params.id)
  if (!seller) return res.status(404).json({ message: "Seller not found" })

  const body = (req.body || {}) as Record<string, any>
  const update: Record<string, any> = {}
  for (const k of Object.keys(body)) {
    if (!ALLOWED.has(k)) continue
    update[k] = body[k] === "" || body[k] === null ? null : body[k]
  }

  if (!Object.keys(update).length) {
    return res.status(400).json({ message: "No valid contact fields to update" })
  }

  update.updated_at = new Date()
  await pg("seller").where({ id: seller.id }).update(update)
  const row = await pg("seller").where({ id: seller.id }).first()
  res.json({ seller: row })
}

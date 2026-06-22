import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveSellerByParam } from "../../../../../lib/resolve-seller"

// POST /admin/sellers/:id/license — update trade license number / expiry (admin)
// Dedicated route so it bypasses the strict Mercur body validator on the base
// seller update endpoint (which rejects unrecognized fields).
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body || {}) as any
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const sellerRow = await resolveSellerByParam(pg, req.params.id as string)
  if (!sellerRow) return res.status(404).json({ message: "Seller not found" })
  const id = sellerRow.id

  const update: any = { updated_at: new Date() }
  if ("trade_license_number" in body) {
    const n = typeof body.trade_license_number === "string" ? body.trade_license_number.trim() : ""
    update.trade_license_number = n || null
  }
  if ("trade_license_expiry" in body) {
    const e = typeof body.trade_license_expiry === "string" ? body.trade_license_expiry.trim() : ""
    // store as YYYY-MM-DD (date column) or null
    update.trade_license_expiry = e || null
  }
  if (Object.keys(update).length <= 1) {
    return res.status(400).json({ message: "Nothing to update" })
  }

  await pg("seller").where({ id }).update(update)
  const [seller] = await pg("seller").where({ id }).select("*")
  res.json({ seller })
}

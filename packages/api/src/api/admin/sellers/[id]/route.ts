import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /admin/sellers/:id — returns the full seller record (including our extended
// columns: company_whatsapp, trade_license_*, default_city_id, etc.)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const row = await pg("seller").where({ id: req.params.id }).first()
  if (!row) return res.status(404).json({ message: "Seller not found" })
  res.json({ seller: row })
}

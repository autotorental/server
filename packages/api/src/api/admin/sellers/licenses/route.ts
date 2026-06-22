// GET /admin/sellers/licenses — license + account status for ALL sellers in one
// query. The built-in /admin/sellers list does not surface our custom
// trade_license_* columns, which made the list show every company as
// "Not verified" even when verified. The list page merges this map in.
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const rows = await pg("seller").select(
    "id",
    "status",
    "trade_license_verified",
    "trade_license_expiry"
  )
  const licenses: Record<string, any> = {}
  for (const r of rows) {
    licenses[r.id] = {
      status: r.status,
      trade_license_verified: !!r.trade_license_verified,
      trade_license_expiry: r.trade_license_expiry,
    }
  }
  res.json({ licenses })
}

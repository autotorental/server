import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /store/sellers/:id/verified — public flag used by the mobile app to show
// the "Verified company" badge (the built-in store seller endpoint omits the
// custom trade_license_verified column).
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  try {
    const row = await pg("seller")
      .where({ id: req.params.id })
      .select("trade_license_verified", "is_premium")
      .first()
    res.json({
      trade_license_verified: !!row?.trade_license_verified,
      is_premium: !!row?.is_premium,
    })
  } catch (e: any) {
    res.json({ trade_license_verified: false, is_premium: false })
  }
}

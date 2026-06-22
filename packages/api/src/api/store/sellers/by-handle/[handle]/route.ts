import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const handle = req.params.handle
  if (!handle) return res.status(400).json({ message: "Handle is required" })

  try {
    const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const [seller] = await pg("seller").where({ handle }).select("*")

    if (!seller) return res.status(404).json({ message: "Seller not found" })

    // Strip private columns — this endpoint is public/unauthenticated.
    const SENSITIVE = [
      "trade_license_number", "trade_license_url", "trade_license_expiry",
      "trade_license_rejection_reason", "trade_license_verified_at",
      "stripe_customer_id", "stripe_subscription_id", "subscription_status",
      "subscription_plan", "subscription_ends_at", "trial_ends_at", "trial_started_at",
      "status_reason", "closure_note", "closed_from", "closed_to", "external_id", "deleted_at",
    ]
    for (const k of SENSITIVE) delete (seller as any)[k]

    // Count this profile view (non-blocking).
    pg("seller").where({ id: seller.id }).increment("profile_view_count", 1).catch(() => {})

    return res.json({ seller })
  } catch (e: any) {
    console.error("[by-handle]", e)
    return res.status(500).json({ message: e?.message || "Internal error" })
  }
}

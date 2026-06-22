import { revalidateSellerPages } from "../../../../lib/storefront-revalidate"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CATALOG_MODULE } from "../../../../modules/catalog"
import { notifyFollowers } from "../../../../lib/follower-notify"
import { removeVehicleFromSearch, syncVehicleToSearch } from "../../../../lib/vehicle-meili"
import { normalizeVehicleMedia } from "../../../../lib/vehicle-media"

function getSellerId(req: MedusaRequest): string | null {
  const auth = (req as any).auth_context
  return auth?.app_metadata?.seller_id || auth?.actor_id || null
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = getSellerId(req); if (!sellerId) return res.status(401).json({ message: "Unauthorized" })
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const v = await svc.retrieveVehicle(req.params.id).catch(() => null)
  if (!v || v.seller_id !== sellerId) return res.status(404).json({ message: "Not found" })
  res.json({ vehicle: v })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = getSellerId(req); if (!sellerId) return res.status(401).json({ message: "Unauthorized" })
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const v = await svc.retrieveVehicle(req.params.id).catch(() => null)
  if (!v || v.seller_id !== sellerId) return res.status(404).json({ message: "Not found" })
  const body = req.body as any
  delete body.id; delete body.seller_id; delete body.approved_at; delete body.rejected_at
  delete body.slug  // SLUG IS PERMANENT — never change it on edit (changing it breaks Google indexing / live URLs)
  delete body.rejection_reason; delete body.rejection_note; delete body.is_featured; delete body.view_count
  try {
    normalizeVehicleMedia(body)
  } catch (e: any) {
    return res.status(400).json({ message: e?.message || "Invalid media payload" })
  }

  // Detect price drop on an ACTIVE vehicle
  const wasActive = v.status === "active"
  const oldDaily = v.daily_price || 0
  const newDaily = body.daily_price ?? oldDaily
  const isPriceDrop = wasActive && newDaily < oldDaily && newDaily > 0

  if (body.status) {
    // Allow self-serve re-activation of a previously-approved car; else only pause/rented/unavailable.
    const allowedStatuses = ["paused", "rented", "unavailable"]
    if (v.approved_at) allowedStatuses.push("active")
    if (!allowedStatuses.includes(body.status)) {
      delete body.status
    }
  }
  // If anything other than status/price is being changed → re-submit for approval
  const editedNonStatus = Object.keys(body).some(k => k !== "status" && !k.startsWith("daily_price") && !k.startsWith("weekly_price") && !k.startsWith("monthly_price") && !k.startsWith("sale_"))
  if (editedNonStatus && v.status !== "draft") {
    body.status = "pending_approval"
  }
  const [updated] = await svc.updateVehicles([{ id: req.params.id, ...body }])

  try { await syncVehicleToSearch(req.scope, updated) } catch { /* optional */ }

  // Fire follower notification on price drop (active vehicle, smaller price, same seller)
  if (isPriceDrop) {
    ;(async () => {
      try {
        const fn = await notifyFollowers(req.scope, sellerId, updated as any, "price_drop", oldDaily)
        console.log(`[follower-notify] price_drop ${updated.id} sent=${fn.sent} skipped=${fn.skipped}`)
      } catch (e: any) { console.error("[follower-notify] price_drop failed:", e?.message || e) }
    })()
  }

  res.json({ vehicle: updated })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = getSellerId(req); if (!sellerId) return res.status(401).json({ message: "Unauthorized" })
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const v = await svc.retrieveVehicle(req.params.id).catch(() => null)
  if (!v || v.seller_id !== sellerId) return res.status(404).json({ message: "Not found" })
  try { await removeVehicleFromSearch(req.params.id) } catch { /* optional */ }
  await svc.deleteVehicles([req.params.id])
  res.json({ id: req.params.id, deleted: true })
}

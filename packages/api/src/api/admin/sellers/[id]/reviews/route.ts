// POST /admin/sellers/:id/reviews
// Body: { google_place_id?, google_rating?, google_reviews?, google_url? }
// Merges Google review data into seller.metadata so the storefront schema + UI can show real stars.
// No Google Places API key configured, so values are entered manually from the company's Google Business Profile.
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveSellerByParam } from "../../../../../lib/resolve-seller"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const seller = await resolveSellerByParam(pg, req.params.id)
  if (!seller) return res.status(404).json({ message: "Seller not found" })

  const b = (req.body || {}) as Record<string, any>
  const current = (seller.metadata && typeof seller.metadata === "object") ? seller.metadata : {}
  const next: Record<string, any> = { ...current }

  // google_place_id / google_url — strings or cleared
  if ("google_place_id" in b) {
    const v = String(b.google_place_id ?? "").trim()
    if (v) next.google_place_id = v; else delete next.google_place_id
  }
  if ("google_url" in b) {
    const v = String(b.google_url ?? "").trim()
    if (v) next.google_url = v; else delete next.google_url
  }

  // google_rating — number 1..5 (one decimal), or cleared
  if ("google_rating" in b) {
    const raw = b.google_rating
    if (raw === "" || raw === null || raw === undefined) {
      delete next.google_rating
    } else {
      const n = Number(raw)
      if (!Number.isFinite(n) || n < 1 || n > 5) return res.status(400).json({ message: "google_rating must be between 1 and 5" })
      next.google_rating = Math.round(n * 10) / 10
    }
  }

  // google_reviews — integer count >= 0, or cleared
  if ("google_reviews" in b) {
    const raw = b.google_reviews
    if (raw === "" || raw === null || raw === undefined) {
      delete next.google_reviews
    } else {
      const n = parseInt(String(raw), 10)
      if (!Number.isFinite(n) || n < 0) return res.status(400).json({ message: "google_reviews must be a positive number" })
      next.google_reviews = n
    }
  }

  await pg("seller").where({ id: seller.id }).update({
    metadata: JSON.stringify(next),
    updated_at: new Date(),
  })
  res.json({
    google_place_id: next.google_place_id || null,
    google_url: next.google_url || null,
    google_rating: next.google_rating ?? null,
    google_reviews: next.google_reviews ?? null,
  })
}

// GET /admin/sellers/:id/reviews — convenience read
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const seller = await resolveSellerByParam(pg, req.params.id)
  if (!seller) return res.status(404).json({ message: "Seller not found" })
  const m = seller.metadata || {}
  res.json({
    google_place_id: m.google_place_id || null,
    google_url: m.google_url || null,
    google_rating: m.google_rating ?? null,
    google_reviews: m.google_reviews ?? null,
  })
}

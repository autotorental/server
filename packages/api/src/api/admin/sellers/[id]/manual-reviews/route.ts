import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// Admin-only manual reviews for a rental company, stored in seller.metadata.manual_reviews.
// Public review posting is disabled (spam) — these are curated by the team and shown on the storefront.
type MReview = { id: string; name: string; rating: number; text: string; created_at: string }

function newId() { return "mrev_" + Math.random().toString(36).slice(2, 12) }

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const seller: any = req.scope.resolve("seller")
  const b = (req.body || {}) as { name?: string; rating?: number; text?: string }
  const name = String(b.name || "").trim().slice(0, 80)
  const rating = Math.max(1, Math.min(5, parseInt(String(b.rating), 10) || 0))
  const text = String(b.text || "").trim().slice(0, 600)
  if (!name || !rating) return res.status(400).json({ message: "name and rating (1-5) are required" })
  const current = await seller.retrieveSeller(req.params.id)
  const meta = (current.metadata && typeof current.metadata === "object") ? current.metadata : {}
  const list: MReview[] = Array.isArray(meta.manual_reviews) ? meta.manual_reviews : []
  const review: MReview = { id: newId(), name, rating, text, created_at: new Date().toISOString() }
  list.unshift(review)
  const [updated] = await seller.updateSellers([{ id: req.params.id, metadata: { ...meta, manual_reviews: list } }])
  res.status(201).json({ review, manual_reviews: (updated.metadata as any)?.manual_reviews || list })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const seller: any = req.scope.resolve("seller")
  const reviewId = String((req.query as any).review_id || "")
  if (!reviewId) return res.status(400).json({ message: "review_id required" })
  const current = await seller.retrieveSeller(req.params.id)
  const meta = (current.metadata && typeof current.metadata === "object") ? current.metadata : {}
  const list: MReview[] = Array.isArray(meta.manual_reviews) ? meta.manual_reviews : []
  const next = list.filter((r) => r.id !== reviewId)
  await seller.updateSellers([{ id: req.params.id, metadata: { ...meta, manual_reviews: next } }])
  res.json({ manual_reviews: next })
}

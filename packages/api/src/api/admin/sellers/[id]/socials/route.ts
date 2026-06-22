// PATCH /admin/sellers/:id/socials
// Body: { facebook?, instagram?, tiktok?, youtube?, whatsapp?, website?, twitter?, telegram?, snapchat? }
// Merges into seller.metadata.social (JSONB).
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveSellerByParam } from "../../../../../lib/resolve-seller"

const ALLOWED = ["facebook", "instagram", "tiktok", "youtube", "whatsapp", "website", "twitter", "telegram", "snapchat"] as const

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const seller = await resolveSellerByParam(pg, req.params.id)
  if (!seller) return res.status(404).json({ message: "Seller not found" })

  const body = (req.body || {}) as Record<string, string>
  const current = (seller.metadata && typeof seller.metadata === "object") ? seller.metadata : {}
  const currentSocial = (current.social && typeof current.social === "object") ? current.social : {}
  const nextSocial: Record<string, string> = { ...currentSocial }
  for (const k of ALLOWED) {
    if (k in body) {
      const v = (body[k] || "").trim()
      if (v) nextSocial[k] = v
      else delete nextSocial[k]
    }
  }
  const nextMetadata = { ...current, social: nextSocial }
  await pg("seller").where({ id: seller.id }).update({
    metadata: JSON.stringify(nextMetadata),
    updated_at: new Date(),
  })
  res.json({ social: nextSocial })
}

// GET /admin/sellers/:id/socials — convenience read
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const seller = await resolveSellerByParam(pg, req.params.id)
  if (!seller) return res.status(404).json({ message: "Seller not found" })
  const social = seller.metadata?.social || {}
  res.json({ social })
}

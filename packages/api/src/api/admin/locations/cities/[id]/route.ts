import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// Raw pg writes — the Medusa module service only persists MODEL-defined fields and
// throws on custom columns (image_url, name_ar). Raw SQL is the reliable path.
const ALLOWED = ["country_code", "name", "name_ar", "slug", "sort_order", "is_active", "image_url"]

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = (req.body || {}) as any
  const update: any = {}
  for (const k of ALLOWED) if (k in body) update[k] = body[k]
  if (!Object.keys(update).length) {
    const [city] = await pg("city").where({ id: req.params.id }).select("*")
    return res.json({ city })
  }
  update.updated_at = new Date()
  try {
    const [city] = await pg("city").where({ id: req.params.id }).update(update).returning("*")
    if (!city) return res.status(404).json({ message: "City not found" })
    res.json({ city })
  } catch (e: any) {
    res.status(400).json({ message: e?.message || "Could not update city" })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  try {
    await pg("city").where({ id: req.params.id }).update({ deleted_at: new Date() })
    res.json({ id: req.params.id, deleted: true })
  } catch (e: any) {
    res.status(400).json({ message: e?.message || "Could not delete city" })
  }
}

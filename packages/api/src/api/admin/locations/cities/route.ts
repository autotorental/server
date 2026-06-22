import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import crypto from "crypto"

// Raw pg — reliable for custom columns (image_url, name_ar) the module service drops.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const country = (req.query.country as string) || undefined
  let q = pg("city").whereNull("deleted_at")
  if (country) q = q.where("country_code", String(country).toLowerCase())
  const cities = await q.orderBy([{ column: "country_code" }, { column: "sort_order" }, { column: "name" }]).select("*")
  res.json({ cities })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = (req.body || {}) as any
  if (!body?.country_code || !body?.name || !body?.slug) {
    return res.status(400).json({ message: "country_code, name, slug required" })
  }
  const id = "city_" + crypto.randomBytes(13).toString("hex")
  try {
    const [city] = await pg("city").insert({
      id,
      country_code: String(body.country_code).toLowerCase(),
      name: body.name,
      name_ar: body.name_ar || null,
      slug: String(body.slug).toLowerCase(),
      sort_order: body.sort_order || 0,
      is_active: body.is_active !== false,
      image_url: body.image_url || null,
      created_at: new Date(),
      updated_at: new Date(),
    }).returning("*")
    res.status(201).json({ city })
  } catch (e: any) {
    res.status(400).json({ message: e?.message || "Could not create city" })
  }
}

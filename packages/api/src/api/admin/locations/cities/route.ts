import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LOCATIONS_MODULE } from "../../../../modules/locations"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(LOCATIONS_MODULE)
  const country = (req.query.country as string) || undefined
  const filters = country ? { country_code: country } : {}
  const cities = await svc.listCities(filters, { order: { country_code: "ASC", sort_order: "ASC", name: "ASC" } })
  res.json({ cities })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(LOCATIONS_MODULE)
  const body = req.body as any
  if (!body?.country_code || !body?.name || !body?.slug) {
    return res.status(400).json({ message: "country_code, name, slug required" })
  }
  const [city] = await svc.createCities([{
    country_code: body.country_code.toLowerCase(),
    name: body.name,
    name_ar: body.name_ar || null,
    slug: body.slug.toLowerCase(),
    sort_order: body.sort_order || 0,
    is_active: body.is_active !== false,
    image_url: body.image_url || null,
  }])
  res.status(201).json({ city })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CATALOG_MODULE } from "../../../../modules/catalog"
import { LOCATIONS_MODULE } from "../../../../modules/locations"
import { meili, ensureIndex, VEHICLES_INDEX } from "../../../../lib/meili"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const m = await meili()
  if (!m) return res.status(503).json({ message: "Meilisearch not configured (MEILI_HOST missing)" })
  await ensureIndex()
  const cat: any = req.scope.resolve(CATALOG_MODULE)
  const loc: any = req.scope.resolve(LOCATIONS_MODULE)
  const seller: any = req.scope.resolve("seller")

  const [vehicles, brands, models, body_types, cities, sellers] = await Promise.all([
    cat.listVehicles({}, { take: 5000 }),
    cat.listBrands({}, { take: 500 }),
    cat.listCarModels({}, { take: 5000 }),
    cat.listBodyTypes({}, { take: 200 }),
    loc.listCities({}, { take: 500 }),
    seller.listSellers({}, { take: 1000 }),
  ])
  const brandMap = new Map(brands.map((b: any) => [b.id, b]))
  const modelMap = new Map(models.map((b: any) => [b.id, b]))
  const bodyMap = new Map(body_types.map((b: any) => [b.id, b]))
  const cityMap = new Map(cities.map((b: any) => [b.id, b]))
  const sellerMap = new Map(sellers.map((b: any) => [b.id, b]))

  const docs = vehicles.map((v: any) => {
    const city: any = cityMap.get(v.city_id)
    const brand: any = brandMap.get(v.brand_id)
    const model: any = modelMap.get(v.model_id)
    const body: any = bodyMap.get(v.body_type_id)
    const sel: any = sellerMap.get(v.seller_id)
    return {
      id: v.id,
      title: v.title,
      description: v.description,
      status: v.status,
      seller_id: v.seller_id,
      seller_name: sel?.name,
      brand_id: v.brand_id,
      brand_name: brand?.name,
      brand_logo: brand?.logo_url,
      model_id: v.model_id,
      model_name: model?.name,
      body_type_id: v.body_type_id,
      body_type_name: body?.name,
      city_id: v.city_id,
      city_name: city?.name,
      country_code: city?.country_code,
      year: v.year,
      color: v.color,
      transmission: v.transmission,
      fuel_type: v.fuel_type,
      seats: v.seats,
      mileage_km: v.mileage_km,
      daily_price: v.daily_price,
      weekly_price: v.weekly_price,
      monthly_price: v.monthly_price,
      sale_daily_price: v.sale_daily_price,
      discount_percent: v.discount_percent,
      discount_label: v.discount_label,
      photos: v.photos,
      feature_ids: v.feature_ids,
      is_featured: v.is_featured ? 1 : 0,
      view_count: v.view_count,
      created_at: new Date(v.created_at).getTime(),
    }
  })
  await m.index(VEHICLES_INDEX).addDocuments(docs)
  res.json({ indexed: docs.length, index: VEHICLES_INDEX })
}

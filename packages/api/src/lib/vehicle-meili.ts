import { CATALOG_MODULE } from "../modules/catalog"
import { LOCATIONS_MODULE } from "../modules/locations"
import { indexVehicle, deleteVehicleFromIndex } from "./meili"

export async function buildVehicleSearchDoc(scope: any, v: any) {
  const cat: any = scope.resolve(CATALOG_MODULE)
  const loc: any = scope.resolve(LOCATIONS_MODULE)
  let brand_name: string | null = null
  let model_name: string | null = null
  let city_name: string | null = null
  let body_type_name: string | null = null
  let seller_name: string | null = null
  try {
    if (v.brand_id) { const [b] = await cat.listBrands({ id: v.brand_id }); brand_name = b?.name || null }
    if (v.model_id) { const [m] = await cat.listCarModels({ id: v.model_id }); model_name = m?.name || null }
    if (v.body_type_id) { const [bt] = await cat.listBodyTypes({ id: v.body_type_id }); body_type_name = bt?.name || null }
    if (v.city_id) { const [c] = await loc.listCities({ id: v.city_id }); city_name = c?.name || null }
  } catch { /* optional joins */ }
  const { ContainerRegistrationKeys } = await import("@medusajs/framework/utils")
  const pg: any = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  if (v.seller_id) {
    const s = await pg("seller").where({ id: v.seller_id }).first()
    seller_name = s?.name || null
  }
  const slug = (v.title || v.id).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
  return {
    id: v.id,
    title: v.title,
    description: v.description,
    status: v.status,
    seller_id: v.seller_id,
    seller_name,
    brand_id: v.brand_id,
    brand_name,
    model_id: v.model_id,
    model_name,
    body_type_id: v.body_type_id,
    body_type_name,
    city_id: v.city_id,
    city_name,
    country_code: null as string | null,
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
    slug,
    created_at: new Date(v.created_at).getTime(),
  }
}

export async function syncVehicleToSearch(scope: any, vehicle: any) {
  if (vehicle.status !== "active") {
    await deleteVehicleFromIndex(vehicle.id)
    return
  }
  const doc = await buildVehicleSearchDoc(scope, vehicle)
  if (vehicle.city_id) {
    const loc: any = scope.resolve(LOCATIONS_MODULE)
    try {
      const [c] = await loc.listCities({ id: vehicle.city_id })
      doc.country_code = c?.country_code || null
    } catch { /* ignore */ }
  }
  await indexVehicle(doc)
}

export async function removeVehicleFromSearch(vehicleId: string) {
  await deleteVehicleFromIndex(vehicleId)
}

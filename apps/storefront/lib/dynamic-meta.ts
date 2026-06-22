// Generates unique SEO metadata + intro paragraph per brand/city using REAL data
// from the catalog. Solves duplicate-content issues completely.

import { api } from "@/lib/api"

export type BrandPageData = {
  brand: any
  vehicles: any[]
  modelNames: string[]
  cityNames: string[]
  priceLow?: number
  priceHigh?: number
  topModels: { name: string; count: number }[]
  count: number
}

export async function loadBrandPage(brandIdOrSlug: string): Promise<BrandPageData | null> {
  const [b, m, c] = await Promise.all([
    api.brands().catch(() => ({ brands: [] })),
    api.models().catch(() => ({ models: [] })),
    api.cities().catch(() => ({ cities: [] })),
  ])
  const brand = b.brands.find((x: any) => x.id === brandIdOrSlug || x.slug === brandIdOrSlug)
  if (!brand) return null
  const v = await api.vehicles({ brand_id: brand.id, limit: 200 }).catch(() => ({ vehicles: [] }))
  const vehicles = v.vehicles
  const modelMap = new Map(m.models.map((x: any) => [x.id, x.name]))
  const cityMap = new Map(c.cities.map((x: any) => [x.id, x.name]))

  const modelCounts = new Map<string, number>()
  const cityCounts = new Map<string, number>()
  let priceLow = Infinity, priceHigh = 0
  for (const v of vehicles) {
    const mname = modelMap.get(v.model_id)
    if (mname) modelCounts.set(mname, (modelCounts.get(mname) || 0) + 1)
    const cname = cityMap.get(v.city_id)
    if (cname) cityCounts.set(cname, (cityCounts.get(cname) || 0) + 1)
    const p = v.sale_daily_price ?? v.daily_price ?? 0
    if (p > 0) { priceLow = Math.min(priceLow, p); priceHigh = Math.max(priceHigh, p) }
  }
  const topModels = [...modelCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }))
  const cityNames = [...cityCounts.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n)
  return {
    brand,
    vehicles,
    modelNames: [...modelCounts.keys()],
    cityNames,
    priceLow: priceLow === Infinity ? undefined : priceLow,
    priceHigh: priceHigh || undefined,
    topModels,
    count: vehicles.length,
  }
}

export function brandMeta(d: BrandPageData) {
  const { brand, count, priceLow, priceHigh, topModels, cityNames } = d
  const topModelsList = topModels.slice(0, 3).map(m => m.name).join(", ")
  const topCitiesList = cityNames.slice(0, 4).join(", ") || "UAE"
  const priceRange = priceLow && priceHigh ? (priceLow === priceHigh ? `${priceLow}` : `${priceLow}–${priceHigh}`) : ""

  const title = count > 0
    ? `Rent ${brand.name} in UAE — ${count} cars from AED ${priceLow}/day`.slice(0, 60)
    : `${brand.name} car rental UAE & Syria | Auto to Rental`

  let description = ""
  if (count > 0) {
    description = `${count} ${brand.name} rental cars in ${topCitiesList}${topModelsList ? ` — popular: ${topModelsList}` : ""}. Daily, weekly, monthly rates ${priceRange ? `from AED ${priceLow}/day` : ""}. Direct contact with verified rental companies. No commission.`.slice(0, 160)
  } else {
    description = `Browse ${brand.name} rental cars across the UAE and Syria. Verified rental companies. Direct contact via WhatsApp, phone, or free international call. No commission.`.slice(0, 160)
  }

  const intro = count > 0
    ? `${brand.name} is one of the most popular car brands available for rent in the UAE${cityNames.length > 0 ? ` — especially in ${topCitiesList}` : ""}. We currently list <strong>${count} ${brand.name} ${count === 1 ? "vehicle" : "vehicles"}</strong> from verified rental companies${priceRange ? `, with daily rates ranging from <strong>AED ${priceLow}</strong> to <strong>AED ${priceHigh}</strong>` : ""}.${topModels.length > 0 ? ` The most-listed models include ${topModels.map(m => `<strong>${m.name}</strong>${m.count > 1 ? ` (${m.count})` : ""}`).join(", ")}.` : ""}`
    : `${brand.name} rental cars will be available soon on Auto to Rental. In the meantime, browse our full catalog or contact us if you have a specific request.`

  return { title, description, intro, focus_keyword: `${brand.name.toLowerCase()} rental UAE` }
}

// CITY VERSION
export type CityPageData = {
  city: any
  vehicles: any[]
  brandCounts: { name: string; count: number; logo?: string }[]
  bodyTypeCounts: { name: string; count: number }[]
  priceLow?: number
  priceHigh?: number
  count: number
}

export async function loadCityPage(cityIdOrSlug: string): Promise<CityPageData | null> {
  const [c, b, bt] = await Promise.all([
    api.cities().catch(() => ({ cities: [] })),
    api.brands().catch(() => ({ brands: [] })),
    api.body_types().catch(() => ({ body_types: [] })),
  ])
  const city = c.cities.find((x: any) => x.id === cityIdOrSlug || x.slug === cityIdOrSlug)
  if (!city) return null
  const v = await api.vehicles({ city_id: city.id, limit: 200 }).catch(() => ({ vehicles: [] }))
  const vehicles = v.vehicles
  const brandMap = new Map(b.brands.map((x: any) => [x.id, x]))
  const bodyMap = new Map(bt.body_types.map((x: any) => [x.id, x.name]))

  const brandCounts = new Map<string, { count: number; logo?: string }>()
  const bodyCounts = new Map<string, number>()
  let priceLow = Infinity, priceHigh = 0
  for (const veh of vehicles) {
    const br: any = brandMap.get(veh.brand_id)
    if (br) {
      const cur = brandCounts.get(br.name) || { count: 0, logo: br.logo_url }
      cur.count += 1
      brandCounts.set(br.name, cur)
    }
    const bn = bodyMap.get(veh.body_type_id)
    if (bn) bodyCounts.set(bn, (bodyCounts.get(bn) || 0) + 1)
    const p = veh.sale_daily_price ?? veh.daily_price ?? 0
    if (p > 0) { priceLow = Math.min(priceLow, p); priceHigh = Math.max(priceHigh, p) }
  }
  return {
    city, vehicles,
    brandCounts: [...brandCounts.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 12).map(([name, v]) => ({ name, count: v.count, logo: v.logo })),
    bodyTypeCounts: [...bodyCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count })),
    priceLow: priceLow === Infinity ? undefined : priceLow,
    priceHigh: priceHigh || undefined,
    count: vehicles.length,
  }
}

export function cityMeta(d: CityPageData) {
  const { city, count, priceLow, brandCounts, bodyTypeCounts } = d
  const country = city.country_code === "sy" ? "Syria" : "UAE"
  const topBrands = brandCounts.slice(0, 3).map(b => b.name).join(", ")
  const topBodies = bodyTypeCounts.slice(0, 3).map(b => b.name.toLowerCase()).join(", ")

  const title = count > 0
    ? `Car Rental ${city.name} — ${count} Cars from AED ${priceLow}/day`.slice(0, 60)
    : `Car Rental in ${city.name}, ${country} | Auto to Rental`

  let description = ""
  if (count > 0) {
    description = `${count} cars for rent in ${city.name}${topBrands ? ` — ${topBrands}` : ""}${topBodies ? ` and other ${topBodies}` : ""}. Daily, weekly, monthly. From AED ${priceLow}/day. Direct contact with verified rental companies. No commission.`.slice(0, 160)
  } else {
    description = `Rent a car in ${city.name}, ${country}. Verified rental companies, direct contact via WhatsApp, phone, or free international call. No commission, no booking fees.`.slice(0, 160)
  }

  const intro = count > 0
    ? `Looking to rent a car in <strong>${city.name}</strong>? Auto to Rental lists <strong>${count} ${count === 1 ? "vehicle" : "vehicles"}</strong> from verified rental companies operating in the city, with daily prices starting at <strong>AED ${priceLow}</strong>${brandCounts.length > 0 ? `. Popular brands available include ${brandCounts.slice(0, 4).map(b => `<strong>${b.name}</strong>`).join(", ")}` : ""}${bodyTypeCounts.length > 0 ? `. Body types range from ${bodyTypeCounts.slice(0, 3).map(b => b.name.toLowerCase()).join(", ")}` : ""}.`
    : `Car rentals in <strong>${city.name}</strong> are coming soon to Auto to Rental. Check back shortly or contact us with your specific request.`

  return { title, description, intro, focus_keyword: `car rental ${city.name.toLowerCase()}` }
}

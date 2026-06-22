const API = process.env.NEXT_PUBLIC_API_URL || "https://api.autotorental.com"
const KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

function toWebpStaticUrl(url: string): string {
  if (!url || !url.includes("/static/")) return url

  // Absolute URL
  try {
    const u = new URL(url)
    if (!u.pathname.startsWith("/static/")) return url
    if (!/\.(png|jpe?g)$/i.test(u.pathname)) return url
    u.pathname = u.pathname.replace(/\.(png|jpe?g)$/i, ".webp")
    return u.toString()
  } catch {
    // Relative URL
    if (!url.startsWith("/static/")) return url
    return url.replace(/\.(png|jpe?g)(?=([?#].*)?$)/i, ".webp")
  }
}

function mapMediaUrlsDeep<T>(value: T): T {
  if (typeof value === "string") {
    return toWebpStaticUrl(value) as T
  }
  if (Array.isArray(value)) {
    return value.map((item) => mapMediaUrlsDeep(item)) as T
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = mapMediaUrlsDeep(v)
    }
    return out as T
  }
  return value
}

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "x-publishable-api-key": KEY, "Content-Type": "application/json", ...(init?.headers || {}) },
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`)
  const data = (await res.json()) as T
  return mapMediaUrlsDeep(data)
}

export type Vehicle = {
  slug?: string;
  id: string; seller_id: string; brand_id: string; model_id?: string; body_type_id?: string; city_id: string
  title: string; description?: string; year?: number; mileage_km?: number; color?: string
  fuel_type?: string; transmission?: string; seats?: number; doors?: number
  currency_code: string
  daily_price?: number; weekly_price?: number; monthly_price?: number
  sale_daily_price?: number; sale_weekly_price?: number; sale_monthly_price?: number
  discount_percent?: number; discount_label?: string
  phone_number?: string; whatsapp_number?: string; livekit_enabled?: boolean
  photos?: string[]; videos?: string[]; feature_ids?: string[]
  seller_name?: string; company_name?: string
  delivery?: { enabled?: boolean; emirates?: string[] }
  status: string; is_featured?: boolean; view_count?: number
  created_at: string
}
export type Brand = { id: string; name: string; slug?: string; logo_url?: string; origin_country?: string; sort_order?: number }
export type CarModel = { id: string; brand_id: string; name: string }
export type BodyType = { id: string; name: string; name_ar?: string; slug?: string; icon?: string; icon_url?: string }
export type Feature = { id: string; name: string; name_ar?: string; category?: string; icon?: string; icon_url?: string }
export type City = { id: string; name: string; name_ar?: string; country_code: string; slug?: string; image_url?: string }
export type Seller = { id: string; name: string; handle?: string; logo?: string; banner?: string; description?: string; phone?: string; email?: string; metadata?: any; created_at?: string }

export const api = {
  vehicles: (q: Record<string,string|number|undefined> = {}) => {
    const qs = new URLSearchParams()
    for (const [k,v] of Object.entries(q)) if (v !== undefined && v !== "") qs.set(k, String(v))
    return get<{ vehicles: Vehicle[]; limit:number; offset:number; count?:number }>(`/store/vehicles?${qs}`)
  },
  vehicle: (id: string) => get<{ vehicle: Vehicle }>(`/store/vehicles/${id}`),
  brands: () => get<{ brands: Brand[] }>(`/store/catalog/brands?limit=200`),
  models: (brand_id?: string) => get<{ models: CarModel[] }>(`/store/catalog/models?limit=2000${brand_id?`&brand_id=${brand_id}`:""}`),
  body_types: () => get<{ body_types: BodyType[] }>(`/store/catalog/body-types?limit=50`),
  body_type_counts: (country?: string) => get<{ counts: Record<string, number> }>(`/store/catalog/body-type-counts${country ? `?country=${country}` : ""}`),
  features: () => get<{ features: Feature[] }>(`/store/catalog/features?limit=200`),
  cities: () => get<{ cities: City[] }>(`/store/locations/cities?limit=200`),
  sellers: () => get<{ sellers: Seller[]; count?: number }>(`/store/sellers?limit=200`),
  seller: (id: string) => get<{ seller: Seller }>(`/store/sellers/${id}`),
  sellerByHandle: (handle: string) => get<{ seller: Seller }>(`/store/sellers/by-handle/${encodeURIComponent(handle)}`),
}

export function fmtPrice(v?: number, ccy = "AED") {
  if (v === undefined || v === null) return ""
  return `${ccy} ${v.toLocaleString()}`
}
export function whatsappLink(phone?: string, msg = "Hi, I am interested in this car from Auto to Rental.") {
  if (!phone) return "#"
  const clean = phone.replace(/[^0-9]/g, "")
  return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`
}

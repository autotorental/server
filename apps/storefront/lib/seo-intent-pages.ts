export type IntentSlug = "daily" | "monthly" | "luxury"

export type SeoIntentPage = {
  citySlug: string
  cityName: string
  brandSlug: string
  brandName: string
  countryCode: "ae" | "sy"
  intent: IntentSlug
}

export const STARTER_SEO_INTENT_PAGES: SeoIntentPage[] = [
  { citySlug: "dubai", cityName: "Dubai", brandSlug: "toyota", brandName: "Toyota", countryCode: "ae", intent: "daily" },
  { citySlug: "dubai", cityName: "Dubai", brandSlug: "nissan", brandName: "Nissan", countryCode: "ae", intent: "monthly" },
  { citySlug: "dubai", cityName: "Dubai", brandSlug: "mercedes-benz", brandName: "Mercedes-Benz", countryCode: "ae", intent: "luxury" },
  { citySlug: "abu-dhabi", cityName: "Abu Dhabi", brandSlug: "toyota", brandName: "Toyota", countryCode: "ae", intent: "daily" },
  { citySlug: "abu-dhabi", cityName: "Abu Dhabi", brandSlug: "kia", brandName: "Kia", countryCode: "ae", intent: "monthly" },
  { citySlug: "sharjah", cityName: "Sharjah", brandSlug: "hyundai", brandName: "Hyundai", countryCode: "ae", intent: "daily" },
  { citySlug: "sharjah", cityName: "Sharjah", brandSlug: "nissan", brandName: "Nissan", countryCode: "ae", intent: "monthly" },
  { citySlug: "dubai", cityName: "Dubai", brandSlug: "bmw", brandName: "BMW", countryCode: "ae", intent: "luxury" },
  { citySlug: "damascus", cityName: "Damascus", brandSlug: "toyota", brandName: "Toyota", countryCode: "sy", intent: "daily" },
  { citySlug: "damascus", cityName: "Damascus", brandSlug: "hyundai", brandName: "Hyundai", countryCode: "sy", intent: "monthly" },
  { citySlug: "aleppo", cityName: "Aleppo", brandSlug: "kia", brandName: "Kia", countryCode: "sy", intent: "daily" },
  { citySlug: "latakia", cityName: "Latakia", brandSlug: "nissan", brandName: "Nissan", countryCode: "sy", intent: "monthly" },
]

export function getSeoIntentPath(page: Pick<SeoIntentPage, "citySlug" | "brandSlug" | "intent">) {
  return `/car-rental/${page.citySlug}/${page.brandSlug}/${page.intent}`
}

export function intentLabel(intent: IntentSlug) {
  if (intent === "monthly") return "monthly"
  if (intent === "luxury") return "luxury"
  return "daily"
}

export function intentKeyword(intent: IntentSlug) {
  if (intent === "monthly") return "monthly car rental"
  if (intent === "luxury") return "luxury car rental"
  return "daily car rental"
}

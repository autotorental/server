import { cookies, headers } from "next/headers"

export type Country = string

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.autotorental.com"
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

// Visitor's country: an explicit cookie (from the switcher) always wins; otherwise
// auto-detect from the visitor's IP (MaxMind GeoLite2 on the API). Defaults to "ae".
export async function getServerCountry(): Promise<Country> {
  const c = await cookies()
  const v = c.get("country")?.value
  if (v && /^[a-z]{2}$/.test(v)) return v
  try {
    const h = await headers()
    const xff = h.get("x-forwarded-for") || h.get("x-real-ip") || ""
    const res = await fetch(`${API}/store/country/detect`, {
      headers: { "x-publishable-api-key": PK, "x-forwarded-for": xff },
      cache: "no-store",
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) {
      const d = await res.json()
      const cc = String(d?.country_code || "").toLowerCase()
      if (/^[a-z]{2}$/.test(cc)) return cc
    }
  } catch { /* fall through */ }
  return "ae"
}

// --- Pure server-safe country helpers (no "use client") ---
export function countryFlag(code: string): string {
  const cc = (code || "").toUpperCase()
  if (!/^[A-Z]{2}$/.test(cc)) return "🌐"
  return String.fromCodePoint(...[...cc].map((ch) => 127397 + ch.charCodeAt(0)))
}

const NAME_OVERRIDES: Record<string, string> = {
  AE: "United Arab Emirates", SY: "Syria", SA: "Saudi Arabia", GB: "United Kingdom", US: "United States",
}
export function countryLabel(code: string): string {
  const cc = (code || "").toUpperCase()
  if (NAME_OVERRIDES[cc]) return NAME_OVERRIDES[cc]
  try {
    const dn = new (Intl as any).DisplayNames(["en"], { type: "region" })
    return dn.of(cc) || cc
  } catch {
    return cc
  }
}

const CCY_MAP: Record<string, string> = {
  AE: "AED", SY: "SYP", SA: "SAR", QA: "QAR", KW: "KWD", OM: "OMR", BH: "BHD",
  EG: "EGP", JO: "JOD", LB: "LBP", IQ: "IQD", TR: "TRY", GB: "GBP", US: "USD",
  EU: "EUR", FR: "EUR", DE: "EUR", IT: "EUR", ES: "EUR", IN: "INR", PK: "PKR",
}
export function countryCurrencyServer(code: string): string {
  return CCY_MAP[(code || "").toUpperCase()] || "USD"
}

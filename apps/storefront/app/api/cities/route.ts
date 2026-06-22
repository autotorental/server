import { NextResponse } from "next/server"
import { City } from "country-state-city"

// GET /api/cities?country=SA -> { cities: ["Riyadh","Jeddah", ...] }
// Server-side only — the country-state-city dataset never reaches the client bundle.
const cache = new Map<string, string[]>()

export function GET(req: Request) {
  const cc = (new URL(req.url).searchParams.get("country") || "").toUpperCase()
  if (!/^[A-Z]{2}$/.test(cc)) return NextResponse.json({ cities: [] })
  let cities = cache.get(cc)
  if (!cities) {
    const seen = new Set<string>()
    cities = (City.getCitiesOfCountry(cc) || [])
      .map((c) => c.name.trim())
      .filter((n) => n && !seen.has(n.toLowerCase()) && seen.add(n.toLowerCase()))
      .sort((a, b) => a.localeCompare(b))
    cache.set(cc, cities)
  }
  return NextResponse.json({ cities }, { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } })
}

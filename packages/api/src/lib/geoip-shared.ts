import { readFileSync, existsSync } from "fs"
import { open as openMmdb, type Reader } from "maxmind"

export const GEOIP_DB_PATH = "/opt/autorental/geoip/GeoLite2-Country.mmdb"

let geoReader: Reader<any> | null = null
let geoLoadFailed = false

export async function getGeoReader(): Promise<Reader<any> | null> {
  if (geoReader) return geoReader
  if (geoLoadFailed) return null
  if (!existsSync(GEOIP_DB_PATH)) {
    geoLoadFailed = true
    console.warn(`[geo] mmdb missing at ${GEOIP_DB_PATH} — using Cloudflare country header when available`)
    return null
  }
  try {
    geoReader = await openMmdb(GEOIP_DB_PATH)
    return geoReader
  } catch (e: any) {
    geoLoadFailed = true
    console.warn("[geo] mmdb load failed:", e.message)
    return null
  }
}

export function countryFromCfHeader(headers: Record<string, unknown>): string | null {
  const raw = headers["cf-ipcountry"] || headers["CF-IPCountry"]
  const code = (Array.isArray(raw) ? raw[0] : raw)?.toString?.().trim().toUpperCase()
  if (!code || code === "XX" || code === "T1") return null
  return code
}

export async function resolveCountryFromIp(
  ip: string | null,
  headers?: Record<string, unknown>
): Promise<{ country_code: string | null; country_name: string | null }> {
  const cf = headers ? countryFromCfHeader(headers) : null
  if (cf) return { country_code: cf, country_name: null }

  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip === "unknown" || ip.startsWith("10.") || ip.startsWith("192.168.")) {
    return { country_code: null, country_name: null }
  }

  const reader = await getGeoReader()
  if (reader) {
    try {
      const r: any = reader.get(ip)
      if (r?.country) {
        return {
          country_code: r.country.iso_code || null,
          country_name: r.country.names?.en || null,
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Free IP-geolocation fallbacks (no API key), cached in-memory to avoid
  // hammering on every request. country.is is primary; ipwho.is is secondary.
  const cached = ipCache.get(ip)
  if (cached && Date.now() - cached.t < IP_CACHE_TTL) {
    return { country_code: cached.cc, country_name: null }
  }
  const providers = [
    { url: `https://api.country.is/${encodeURIComponent(ip)}`, pick: (j: any) => j?.country },
    { url: `https://ipwho.is/${encodeURIComponent(ip)}?fields=country_code,success`, pick: (j: any) => (j?.success === false ? null : j?.country_code) },
  ]
  for (const p of providers) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 2500)
      const r = await fetch(p.url, { signal: ctrl.signal })
      clearTimeout(t)
      if (!r.ok) continue
      const j = await r.json()
      const code = String(p.pick(j) || "").toUpperCase()
      if (/^[A-Z]{2}$/.test(code)) {
        ipCache.set(ip, { cc: code, t: Date.now() })
        return { country_code: code, country_name: null }
      }
    } catch {
      /* try next provider */
    }
  }

  return { country_code: null, country_name: null }
}

// Simple in-memory IP→country cache (12h) to limit external lookups.
const IP_CACHE_TTL = 12 * 60 * 60 * 1000
const ipCache: Map<string, { cc: string; t: number }> = new Map()

import { resolveCountryFromIp } from "./geoip-shared"

export { GEOIP_DB_PATH, getGeoReader, resolveCountryFromIp, countryFromCfHeader } from "./geoip-shared"

export async function ipToCountry(ip: string, headers?: Record<string, unknown>): Promise<string | null> {
  const { country_code } = await resolveCountryFromIp(ip, headers)
  return country_code?.toLowerCase() || null
}

export function getClientIp(req: any): string {
  const forwarded = req.headers["x-forwarded-for"]
  if (forwarded) {
    return (typeof forwarded === "string" ? forwarded.split(",")[0] : forwarded[0])?.trim() || req.ip || "unknown"
  }
  const cfIp = req.headers["cf-connecting-ip"]
  if (cfIp) return typeof cfIp === "string" ? cfIp : cfIp[0]
  return req.ip || "unknown"
}

import { readFileSync } from 'fs'
import { join } from 'path'
import maxmind from 'maxmind'

let lookup: any = null

async function getLookup() {
  if (!lookup) {
    const dbPath = join(__dirname, '..', '..', '..', '..', 'geoip', 'GeoLite2-Country.mmdb')
    lookup = await maxmind.open(dbPath)
  }
  return lookup
}

export async function ipToCountry(ip: string): Promise<string | null> {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'unknown' || ip === 'localhost') return null
  try {
    const lk = await getLookup()
    const result = lk.get(ip)
    return result?.country?.iso_code?.toLowerCase() || null
  } catch {
    return null
  }
}

export function getClientIp(req: any): string {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    return (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0])?.trim() || req.ip || 'unknown'
  }
  const cfIp = req.headers['cf-connecting-ip']
  if (cfIp) return typeof cfIp === 'string' ? cfIp : cfIp[0]
  return req.ip || 'unknown'
}

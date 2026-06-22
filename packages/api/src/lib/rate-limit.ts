// Simple in-memory sliding-window rate limiter for public endpoints.
// Per-process (fine for single pm2 instance). Protects vendor phones + analytics integrity.
const buckets: Record<string, Map<string, number[]>> = {}

export function clientIp(req: any): string {
  return ((req.headers?.["x-forwarded-for"] as string) || "").split(",")[0].trim() || req.ip || "unknown"
}

export function rateLimited(key: string, ip: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const m = buckets[key] || (buckets[key] = new Map())
  const hits = (m.get(ip) || []).filter((t) => now - t < windowMs)
  if (hits.length >= max) { m.set(ip, hits); return true }
  hits.push(now); m.set(ip, hits)
  // opportunistic cleanup
  if (m.size > 5000) { for (const [k, v] of m) { if (!v.some((t) => now - t < windowMs)) m.delete(k) } }
  return false
}

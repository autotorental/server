import { lookup } from "dns/promises"

// Reject private / loopback / link-local / metadata targets to prevent SSRF.
function isPrivateIp(ip: string): boolean {
  // IPv6 loopback / ULA / link-local
  if (ip === "::1" || ip === "::") return true
  if (/^f[cd][0-9a-f]{2}:/i.test(ip)) return true      // fc00::/7 unique-local
  if (/^fe80:/i.test(ip)) return true                  // link-local
  // IPv4-mapped IPv6 → extract v4
  const v4m = ip.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/i)
  if (v4m) ip = v4m[1]
  const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (!m) return false
  const [a, b] = [Number(m[1]), Number(m[2])]
  if (a === 10) return true                              // 10.0.0.0/8
  if (a === 127) return true                             // loopback
  if (a === 0) return true                               // 0.0.0.0/8
  if (a === 169 && b === 254) return true               // link-local + AWS/GCP metadata 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true      // 172.16.0.0/12
  if (a === 192 && b === 168) return true               // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true     // CGNAT 100.64.0.0/10
  return false
}

// Resolve a hostname and throw if it points at a private/internal address.
export async function assertPublicHost(hostname: string): Promise<void> {
  const clean = hostname.replace(/^\[|\]$/g, "")
  // Block obvious literals immediately
  if (/^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.)/i.test(clean)) {
    throw new Error("Target host is not allowed (private/internal address)")
  }
  let addrs: { address: string }[]
  try {
    addrs = await lookup(clean, { all: true })
  } catch {
    throw new Error("Could not resolve host")
  }
  for (const a of addrs) {
    if (isPrivateIp(a.address)) {
      throw new Error("Target resolves to a private/internal address — blocked")
    }
  }
}

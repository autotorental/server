import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveVendorSellerId } from "../../../lib/vendor-seller"
import { assertPublicHost } from "../../../lib/ssrf-guard"
import { createHash, randomBytes } from "crypto"

function cleanDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`)
    return u.hostname.replace(/^www\./, "").toLowerCase()
  } catch { return url.toLowerCase().replace(/^www\./, "").replace(/[^a-z0-9.-]/g, "") }
}

function makeToken(sellerId: string): string {
  const rand = randomBytes(12).toString("hex")
  const hash = createHash("sha256").update(sellerId + rand).digest("hex").slice(0, 16)
  return `atr-site-verify-${hash}`
}

async function checkVerification(domain: string, token: string): Promise<{ ok: boolean; method: string; error?: string }> {
  try { await assertPublicHost(domain) } catch (e: any) { return { ok: false, method: "none", error: e.message } }
  const urls = [`https://${domain}`, `https://www.${domain}`, `http://${domain}`]
  for (const baseUrl of urls) {
    try {
      const r = await fetch(baseUrl, {
        headers: { "User-Agent": "AutoToRental-Verify/1.0" },
        signal: AbortSignal.timeout(10000),
        redirect: "follow",
      })
      if (!r.ok) continue
      const html = await r.text()
      // Method 1: meta tag
      if (html.includes(`content="${token}"`) || html.includes(`content='${token}'`)) {
        return { ok: true, method: "meta-tag" }
      }
      // Method 2: verification file
      try {
        const fileR = await fetch(`${baseUrl}/${token}.txt`, { signal: AbortSignal.timeout(5000) })
        if (fileR.ok) {
          const txt = await fileR.text()
          if (txt.trim().includes(token)) return { ok: true, method: "file" }
        }
      } catch {}
    } catch {}
  }
  // Method 3: DNS TXT (check via Google DoH)
  try {
    const dnsR = await fetch(`https://dns.google/resolve?name=${domain}&type=TXT`, {
      signal: AbortSignal.timeout(8000),
    })
    const dns = await dnsR.json()
    const txts = (dns.Answer || []).map((a: any) => a.data || "").join(" ")
    if (txts.includes(token)) return { ok: true, method: "dns-txt" }
  } catch {}
  return { ok: false, method: "none", error: "Token not found via meta tag, file, or DNS TXT" }
}

// POST /vendor/domain-verify — register or re-check
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "Unauthorized" })

  const { domain: rawDomain, action } = (req.body || {}) as { domain?: string; action?: "register" | "verify" | "status" }
  const domain = rawDomain ? cleanDomain(rawDomain) : null

  // GET STATUS
  if (action === "status" || (!domain && !action)) {
    const row = await pg("domain_verification").where({ seller_id: sellerId }).first()
    return res.json({ row: row || null })
  }

  if (!domain) return res.status(400).json({ message: "domain required" })

  // Basic domain validation
  if (!/^[a-z0-9][a-z0-9.-]{1,60}\.[a-z]{2,}$/.test(domain)) {
    return res.status(400).json({ message: "Invalid domain format" })
  }

  // REGISTER — create/update token
  if (action === "register" || !action) {
    const existing = await pg("domain_verification").where({ seller_id: sellerId }).first()
    if (existing?.verified && existing.domain === domain) {
      return res.json({ already_verified: true, domain, token: existing.token, verified: true })
    }
    const token = makeToken(sellerId)
    await pg("domain_verification")
      .insert({ seller_id: sellerId, domain, token, verified: false, created_at: new Date(), updated_at: new Date() })
      .onConflict("seller_id")
      .merge({ domain, token, verified: false, updated_at: new Date() })
    return res.json({
      domain,
      token,
      instructions: {
        meta: `<meta name="autotorental-site-verification" content="${token}">`,
        file: `Create file at: https://${domain}/${token}.txt with content: ${token}`,
        dns: `Add DNS TXT record: autotorental-site-verification=${token}`,
      },
    })
  }

  // VERIFY — check if token is live
  if (action === "verify") {
    const row = await pg("domain_verification").where({ seller_id: sellerId }).first()
    if (!row) return res.status(400).json({ message: "Register domain first" })
    if (row.domain !== domain) return res.status(400).json({ message: "Domain mismatch — re-register" })

    await pg("domain_verification").where({ seller_id: sellerId }).update({
      attempts: (row.attempts || 0) + 1,
      last_attempt_at: new Date(),
      updated_at: new Date(),
    })

    const result = await checkVerification(domain, row.token)
    if (result.ok) {
      await pg("domain_verification").where({ seller_id: sellerId }).update({
        verified: true, verified_at: new Date(), updated_at: new Date(),
      })
      return res.json({ verified: true, method: result.method, domain })
    }
    return res.json({ verified: false, error: result.error, domain, token: row.token })
  }

  return res.status(400).json({ message: "Invalid action" })
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "Unauthorized" })
  const row = await pg("domain_verification").where({ seller_id: sellerId }).first()
  res.json({ row: row || null })
}

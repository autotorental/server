import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveVendorSellerId } from "../../../lib/vendor-seller"

// Custom vendor domain hosting: a rental company points its own domain
// (e.g. 4maticrental.com) at our server; nginx then serves that company's
// public page (autotorental.com/companies/<handle>) on the custom domain,
// with an auto-issued Let's Encrypt certificate (handled by the provisioner
// cron — scripts/provision-custom-domains.sh). This route is the vendor-facing
// control panel: set the domain, get DNS instructions, and re-check DNS.
const SERVER_IP = process.env.PUBLIC_SERVER_IP || "76.13.184.134"

// Platform hostnames a vendor must never be able to claim.
const BLOCKED = new Set([
  "autotorental.com", "www.autotorental.com", "api.autotorental.com",
  "admin.autotorental.com", "partner.autotorental.com", "seller.autotorental.com",
  "livekit.autotorental.com", "webmail.autotorental.com",
])

function cleanDomain(input: string): string {
  try {
    const u = new URL(input.startsWith("http") ? input : `https://${input}`)
    return u.hostname.replace(/^www\./, "").toLowerCase()
  } catch {
    return String(input || "").toLowerCase().trim().replace(/^www\./, "").replace(/[^a-z0-9.-]/g, "")
  }
}
const isValid = (d: string) => /^[a-z0-9][a-z0-9.-]{1,60}\.[a-z]{2,}$/.test(d) && !d.includes("..")

function dnsInstructions(domain: string) {
  return {
    server_ip: SERVER_IP,
    records: [
      { type: "A", host: "@", value: SERVER_IP },
      { type: "A", host: "www", value: SERVER_IP },
    ],
  }
}

// Resolve A records via Google DoH so we see fresh DNS, not the box's resolver cache.
async function aRecords(host: string): Promise<string[]> {
  try {
    const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(host)}&type=A`, {
      headers: { accept: "application/dns-json" },
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) return []
    const d: any = await r.json()
    return (d.Answer || []).filter((a: any) => a.type === 1).map((a: any) => String(a.data))
  } catch { return [] }
}
async function pointsToUs(domain: string): Promise<boolean> {
  for (const h of [domain, `www.${domain}`]) {
    if ((await aRecords(h)).includes(SERVER_IP)) return true
  }
  return false
}

async function sellerRow(pg: any, sid: string) {
  return pg("seller").where({ id: sid }).first()
}
function publicState(s: any) {
  const status = s?.custom_domain_status || (s?.custom_domain ? "pending" : null)
  return {
    domain: s?.custom_domain || null,
    status,
    error: s?.custom_domain_error || null,
    handle: s?.handle || null,
    live_url: s?.custom_domain && status === "live" ? `https://${s.custom_domain}` : null,
    instructions: dnsInstructions(s?.custom_domain || "yourdomain.com"),
  }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sid = await resolveVendorSellerId(req); if (!sid) return res.status(401).json({ message: "Unauthorized" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const s = await sellerRow(pg, sid); if (!s) return res.status(404).json({ message: "Seller not found" })
  res.json(publicState(s))
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const sid = await resolveVendorSellerId(req); if (!sid) return res.status(401).json({ message: "Unauthorized" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = (req.body || {}) as { domain?: string; action?: string }
  const action = body.action || "set"

  // RE-CHECK DNS — does the domain (or www) resolve to our server yet?
  if (action === "verify") {
    const s = await sellerRow(pg, sid)
    if (!s?.custom_domain) return res.status(400).json({ message: "Add a domain first" })
    const ok = await pointsToUs(s.custom_domain)
    // Once live we stay live; otherwise dns_ok when pointing at us, else still pending.
    const status = s.custom_domain_status === "live" ? "live" : (ok ? "dns_ok" : "pending")
    const error = ok ? null : `Your domain doesn't point to ${SERVER_IP} yet. DNS changes can take up to 30 minutes.`
    await pg("seller").where({ id: sid }).update({ custom_domain_status: status, custom_domain_error: error, updated_at: new Date() })
    return res.json({ ...publicState({ ...s, custom_domain_status: status, custom_domain_error: error }), dns_ok: ok })
  }

  // DISCONNECT — the provisioner reconciler removes the vhost/cert on its next run.
  if (action === "remove") {
    await pg("seller").where({ id: sid }).update({ custom_domain: null, custom_domain_status: null, custom_domain_error: null, updated_at: new Date() })
    return res.json(publicState(await sellerRow(pg, sid)))
  }

  // SET / CHANGE the domain.
  const domain = body.domain ? cleanDomain(body.domain) : null
  if (!domain) return res.status(400).json({ message: "Please enter a domain" })
  if (!isValid(domain)) return res.status(400).json({ message: "That doesn't look like a valid domain (e.g. mycars.com)" })
  if (BLOCKED.has(domain) || domain.endsWith(".autotorental.com")) return res.status(400).json({ message: "This domain can't be used" })
  const taken = await pg("seller").where({ custom_domain: domain }).whereNot({ id: sid }).first()
  if (taken) return res.status(409).json({ message: "This domain is already connected to another company" })

  await pg("seller").where({ id: sid }).update({ custom_domain: domain, custom_domain_status: "pending", custom_domain_error: null, updated_at: new Date() })
  res.json(publicState(await sellerRow(pg, sid)))
}

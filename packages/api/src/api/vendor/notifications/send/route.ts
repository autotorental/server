import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveVendorSellerId } from "../../../../lib/vendor-seller"
import { sendPushToTokens } from "../../../../lib/push"

// Vendor self-service push: a rental company notifies ONLY its own audience —
// customers whose device is tagged to this seller + followers (seller_follow)
// matched by email. A vendor can NEVER reach the whole platform.
// GET  /vendor/notifications/send  -> reachable device + follower counts
// POST /vendor/notifications/send  { title, body, link? }

const cooldown = new Map<string, number>() // seller_id -> last send (ms)

async function audienceTokens(pg: any, sellerId: string): Promise<string[]> {
  // (1) client devices tagged to this seller (followed / contacted via the app)
  const tagged = await pg("push_token").whereNotNull("token").where({ seller_id: sellerId, role: "client" }).select("token").catch(() => [] as any[])
  // (2) followers matched by email to a registered client device
  const emails = (await pg("seller_follow").where({ seller_id: sellerId }).whereNull("deleted_at").whereNotNull("follower_email").select("follower_email").catch(() => [] as any[]))
    .map((r: any) => String(r.follower_email || "").toLowerCase()).filter(Boolean)
  let byEmail: any[] = []
  if (emails.length) {
    const clientTokens = await pg("push_token").where("role", "client").whereNotNull("token").whereNotNull("email").select("email", "token").catch(() => [] as any[])
    byEmail = clientTokens.filter((r: any) => emails.includes(String(r.email || "").toLowerCase()))
  }
  return Array.from(new Set([...tagged, ...byEmail].map((r: any) => r.token).filter(Boolean)))
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sid = await resolveVendorSellerId(req); if (!sid) return res.status(401).json({ message: "Unauthorized" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const tokens = await audienceTokens(pg, sid)
  const f = await pg("seller_follow").where({ seller_id: sid }).whereNull("deleted_at").count("* as n").first().catch(() => ({ n: 0 }))
  res.json({ reachable_devices: tokens.length, followers: Number((f && f.n) || 0) })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const sid = await resolveVendorSellerId(req); if (!sid) return res.status(401).json({ message: "Unauthorized" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = (req.body || {}) as any
  const title = String(body.title || "").trim().slice(0, 80)
  const message = String(body.body || body.message || "").trim().slice(0, 300)
  const link = body.link ? String(body.link).trim().slice(0, 400) : undefined
  if (!title || !message) return res.status(400).json({ message: "Title and message are required" })

  const now = Date.now()
  const last = cooldown.get(sid) || 0
  if (now - last < 30000) return res.status(429).json({ message: `Please wait ${Math.ceil((30000 - (now - last)) / 1000)}s before sending again.` })

  const tokens = await audienceTokens(pg, sid)
  if (!tokens.length) return res.json({ sent: 0, targeted: 0, message: "None of your followers have notifications enabled yet." })

  cooldown.set(sid, now)
  const seller = await pg("seller").where({ id: sid }).first().catch(() => null)
  const fromTitle = (seller && seller.name) ? `${seller.name}: ${title}` : title
  // Link: a full URL stays; a bare path resolves to the vendor's store page.
  let finalLink = link
  if (link && !/^https?:\/\//i.test(link)) finalLink = `https://autotorental.com/companies/${(seller && seller.handle) || sid}`

  const result: any = await sendPushToTokens(tokens, { title: fromTitle, body: message, data: finalLink ? { link: finalLink } : undefined })
  const results: any[] = (result && result.results) || []
  const dead = results.filter((r) => r.code === "messaging/registration-token-not-registered").map((r) => r.token)
  if (dead.length) { try { await pg("push_token").whereIn("token", dead).del() } catch {} }
  res.json({ sent: (result && result.sent) || 0, targeted: tokens.length, message: `Sent to ${(result && result.sent) || 0} of ${tokens.length} follower device(s).` })
}

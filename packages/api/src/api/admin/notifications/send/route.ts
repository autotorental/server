import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendPushToTokens } from "../../../../lib/push"

// GET — device audience counts; POST — send a push to the chosen audience.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  let rows: any[] = []
  try { rows = await pg("push_token").whereNotNull("token").select("role", "platform") } catch {}
  const c = { all: rows.length, vendors: 0, customers: 0, ios: 0, android: 0, web: 0 }
  for (const r of rows) {
    if (r.role === "seller" || r.role === "vendor") c.vendors++
    else if (r.role === "customer") c.customers++
    if (r.platform === "ios") c.ios++
    else if (r.platform === "android") c.android++
    else if (r.platform === "web") c.web++
  }
  res.json({ counts: c })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = (req.body as any) || {}
  const title = String(body.title || "").trim()
  const message = String(body.body || "").trim()
  const audience = String(body.audience || "all")
  const link = String(body.link || "").trim()
  const image = String(body.image || "").trim()
  if (!title || !message) return res.status(400).json({ message: "Title and message are required" })

  let q = pg("push_token").whereNotNull("token")
  if (audience === "vendors") q = q.whereIn("role", ["seller", "vendor"])
  else if (audience === "customers") q = q.where("role", "customer")
  else if (audience === "ios") q = q.where("platform", "ios")
  else if (audience === "android") q = q.where("platform", "android")
  else if (audience === "web") q = q.where("platform", "web")
  const rows = await q.select("token")
  const tokens = Array.from(new Set(rows.map((r: any) => r.token).filter(Boolean))) as string[]
  if (!tokens.length) return res.json({ sent: 0, targeted: 0, message: "No devices registered for this audience yet." })

  try {
    const result: any = await sendPushToTokens(tokens, { title, body: message, data: link ? { link } : undefined, image: image || undefined })
    const results: any[] = result?.results || []
    // Self-heal: drop tokens FCM reports as permanently gone (app uninstalled / token rotated).
    const dead = results.filter((r) => r.code === "messaging/registration-token-not-registered").map((r) => r.token)
    if (dead.length) { try { await pg("push_token").whereIn("token", dead).del() } catch {} }
    const apns = results.filter((r) => r.code === "messaging/third-party-auth-error").length
    let msg = `Sent to ${result?.sent ?? 0} of ${tokens.length} device(s).`
    if (apns) msg += ` ${apns} iOS device(s) failed — APNs key is NOT configured in Firebase (Project Settings → Cloud Messaging → Apple app config). Android delivery works.`
    if (dead.length) msg += ` Cleaned ${dead.length} expired token(s).`
    res.json({ sent: result?.sent ?? 0, failed: result?.failed ?? 0, targeted: tokens.length, removed: dead.length, apns_failed: apns, message: msg })
  } catch (e: any) {
    res.status(500).json({ message: "Send failed: " + String(e?.message || e) })
  }
}

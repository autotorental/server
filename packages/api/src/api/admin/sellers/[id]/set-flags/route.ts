import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { checkCan, parseMeta } from "../../../../../lib/supervisor"
import { logUserEvent } from "../../../../../lib/user-history"

// POST /admin/sellers/:id/set-flags — toggle VIP / Verified / Featured / Suspended on a seller.
// Each flag is permission-checked (and country-scoped for supervisors). Owner = full access.
// Body: { vip?: bool, verified?: bool, featured?: bool, suspended?: bool }
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const id = (req.params as any).id
  const body = (req.body || {}) as { vip?: boolean; verified?: boolean; featured?: boolean; suspended?: boolean }

  const seller = await pg("seller").where({ id }).first()
  if (!seller) return res.status(404).json({ message: "Rental company not found" })

  // toggle mode: server reads the current DB value and flips it (reliable, no client state)
  const tk = (req.body as any)?.toggle
  if (tk) {
    const cur: Record<string, boolean> = {
      vip: !!seller.is_premium,
      verified: !!seller.trade_license_verified,
      featured: !!parseMeta(seller.metadata).featured,
      suspended: seller.status === "suspended",
    }
    if (tk in cur) (body as any)[tk] = !cur[tk]
  }

  const permFor: Record<string, string> = { vip: "vip", verified: "verified", featured: "featured", suspended: "suspend" }
  for (const flag of Object.keys(permFor)) {
    if (flag in body) {
      const denied = await checkCan(req, pg, permFor[flag], id)
      if (denied) return res.status(denied.status).json({ message: denied.message })
    }
  }

  const upd: any = { updated_at: new Date() }
  const done: string[] = []
  if ("vip" in body) { upd.is_premium = !!body.vip; done.push(`VIP ${body.vip ? "on" : "off"}`) }
  if ("verified" in body) {
    upd.trade_license_verified = !!body.verified
    if (body.verified) upd.trade_license_verified_at = new Date()
    done.push(`Verified ${body.verified ? "on" : "off"}`)
  }
  if ("suspended" in body) { upd.status = body.suspended ? "suspended" : "open"; done.push(body.suspended ? "Suspended" : "Reactivated") }
  if ("featured" in body) {
    const md = parseMeta(seller.metadata); md.featured = !!body.featured
    upd.metadata = JSON.stringify(md); done.push(`Featured ${body.featured ? "on" : "off"}`)
  }
  if (!done.length) return res.status(400).json({ message: "No flags provided" })

  await pg("seller").where({ id }).update(upd)
  await logUserEvent(pg, id, "seller", "flags_changed", done.join(", "), (req as any).auth_context?.actor_id).catch(() => {})
  res.json({ success: true, seller_id: id, changed: done, message: done.join(", ") })
}

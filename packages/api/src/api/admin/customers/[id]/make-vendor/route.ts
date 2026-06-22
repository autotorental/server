import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import crypto from "crypto"
import { logUserEvent } from "../../../../../lib/user-history"
import { ensureEmailpassLogin } from "../../../../../lib/customer-login"
const nid = (p: string) => p + crypto.randomBytes(13).toString("hex").toUpperCase()
const slug = (s: string) => (s || "company").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "company"
const meta = (r: unknown) => { if (!r) return {}; if (typeof r === "string") { try { return JSON.parse(r) } catch { return {} } } return typeof r === "object" ? { ...(r as any) } : {} }

async function findAuth(pg: any, id: string, email?: string) {
  let ai = await pg("auth_identity").whereRaw(`app_metadata::jsonb->>'customer_id' = ?`, [id]).whereNull("deleted_at").first()
  if (!ai && email) {
    const pi = await pg("provider_identity").where({ provider: "emailpass", entity_id: email }).whereNull("deleted_at").first()
    if (pi) ai = await pg("auth_identity").where({ id: pi.auth_identity_id }).first()
  }
  return ai
}

// POST /admin/customers/:id/make-vendor — promote a storefront customer into a
// rental company (vendor). Same login works for the vendor portal afterwards.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const id = (req.params as any).id
  const customer = await pg("customer").where({ id }).first()
  if (!customer) return res.status(404).json({ message: "Customer not found" })
  let ai = await findAuth(pg, id, customer.email)
  let createdPassword: string | undefined
  if (!ai) {
    const lg = await ensureEmailpassLogin(pg, customer)
    if (lg.error) return res.status(400).json({ message: lg.error })
    createdPassword = lg.newPassword
    ai = await pg("auth_identity").where({ id: lg.auth_identity_id }).first()
  }
  if (!ai) return res.status(500).json({ message: "Could not create a login for this customer." })
  const m = meta(ai.app_metadata)
  if (m.seller_id) return res.json({ success: true, already: true, seller_id: m.seller_id, message: "Already a vendor." })

  const name = (`${customer.first_name || ""} ${customer.last_name || ""}`.trim()) || String(customer.email || "Vendor").split("@")[0]
  const sellerId = nid("sel_")
  const handle = slug(name) + "-" + crypto.randomBytes(2).toString("hex")
  try {
    await pg("seller").insert({
      id: sellerId, name, handle, email: customer.email, phone: customer.phone || null, currency_code: "aed",
      metadata: JSON.stringify({ promoted_from_customer: id }), status: "open", is_premium: false,
      subscription_status: "trial", trial_ends_at: new Date(Date.now() + 30 * 864e5),
    })
    const memberId = nid("mem_")
    await pg("member").insert({ id: memberId, email: customer.email, first_name: name, is_active: true })
    await pg("seller_member").insert({ id: nid("smbr_"), seller_id: sellerId, member_id: memberId, role_id: "role_seller_administration", is_owner: true })
    m.seller_id = sellerId
    m.member_id = memberId // partner portal resolves the logged-in vendor via app_metadata.member_id
    await pg("auth_identity").where({ id: ai.id }).update({ app_metadata: JSON.stringify(m), updated_at: new Date() })
    await logUserEvent(pg, id, "customer", "became_vendor", "Promoted to rental company " + handle, (req as any).auth_context?.actor_id)
    res.json({ success: true, seller_id: sellerId, handle, new_password: createdPassword, login_email: (customer.email || "").trim().toLowerCase(), message: "Customer is now a vendor (pending approval). They sign in to the vendor portal with this email/password." })
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "Failed to create vendor" })
  }
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

function gen8(): string {
  let n = ""
  for (let i = 0; i < 8; i++) n += Math.floor(Math.random() * 10).toString()
  return n
}

// GET /store/call-code  → returns (and lazily creates) the caller's personal
// 8-digit free-call number. Identity: signed-in customer, vendor (seller_id),
// or a guest device_id.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const q = req.query as any
  const auth: any = (req as any).auth_context || {}

  let userId: string | null = null
  let email: string | null = null
  let sellerId: string | null = null
  const deviceId: string | null = (q.device_id as string) || null

  if (auth.actor_type === "customer" && auth.actor_id) {
    userId = auth.actor_id
    try {
      const cm: any = req.scope.resolve(Modules.CUSTOMER)
      const c = await cm.retrieveCustomer(auth.actor_id)
      email = c?.email || null
    } catch {}
  } else if (auth.actor_id) {
    try {
      const m = await pg("member").where({ user_id: auth.actor_id }).select("seller_id").first()
      sellerId = m?.seller_id || auth?.app_metadata?.seller_id || null
    } catch {}
  }
  if (!userId && !sellerId && q.seller_id) sellerId = String(q.seller_id)

  if (!userId && !sellerId && !deviceId) {
    return res.status(400).json({ message: "identity required" })
  }

  let row: any = null
  if (userId) row = await pg("call_code").where({ user_id: userId }).first()
  if (!row && sellerId) row = await pg("call_code").where({ seller_id: sellerId }).first()
  if (!row && deviceId) row = await pg("call_code").where({ device_id: deviceId }).first()

  if (row) return res.json({ code: row.code })

  let code = gen8()
  for (let i = 0; i < 6; i++) {
    const exists = await pg("call_code").where({ code }).first()
    if (!exists) break
    code = gen8()
  }
  await pg("call_code").insert({ code, user_id: userId, seller_id: sellerId, email, device_id: deviceId })
  res.json({ code })
}

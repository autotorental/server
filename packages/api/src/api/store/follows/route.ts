import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { FOLLOWS_MODULE } from "../../../modules/follows"

// GET /store/follows?follower_device_id=...&follower_email=...
// Returns the rental companies (sellers) the caller follows. If a verified
// customer bearer token is present, the customer's email is used automatically.
async function authedCustomerEmail(req: MedusaRequest): Promise<string | null> {
  const auth = (req as any).auth_context
  if (!auth || auth.actor_type !== "customer" || !auth.actor_id) return null
  try {
    const customerModule: any = req.scope.resolve(Modules.CUSTOMER)
    const customer = await customerModule.retrieveCustomer(auth.actor_id)
    return customer?.email || null
  } catch {
    return null
  }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(FOLLOWS_MODULE)
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const q = req.query as any
  const email = (await authedCustomerEmail(req)) || (q.follower_email as string | undefined)
  const deviceId = q.follower_device_id as string | undefined

  if (!email && !deviceId) {
    return res.json({ sellers: [], count: 0 })
  }

  // Collect follows for this follower (by email and/or device).
  const follows: any[] = []
  if (email) follows.push(...(await svc.listSellerFollows({ follower_email: email }, { order: { created_at: "DESC" } })))
  if (deviceId) follows.push(...(await svc.listSellerFollows({ follower_device_id: deviceId }, { order: { created_at: "DESC" } })))
  follows.sort((a:any,b:any)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const ids = Array.from(new Set(follows.map((f) => f.seller_id).filter(Boolean)))
  if (ids.length === 0) return res.json({ sellers: [], count: 0 })

  const rows = await knex("seller")
    .whereIn("id", ids)
    .whereNull("deleted_at")
    .select("id", "name", "handle", "logo", "banner")

  // preserve follow recency (most recent first) when the module returns created_at
  const order = new Map(ids.map((id, i) => [id, i]))
  rows.sort((a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))

  res.json({ sellers: rows, count: rows.length })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { FOLLOWS_MODULE } from "../../../../../modules/follows"

// When the request carries a verified customer session/bearer, the follow is
// bound to that customer's real email so a logged-in user can't follow or
// unfollow on behalf of someone else's address. Guests (device_id only) are
// unaffected and continue to work without auth.
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

// POST → follow
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(FOLLOWS_MODULE)
  const body = req.body as any
  const authedEmail = await authedCustomerEmail(req)
  if (authedEmail) body.follower_email = authedEmail
  if (!body?.follower_email && !body?.follower_device_id) {
    return res.status(400).json({ message: "follower_email or follower_device_id required" })
  }
  // Check existing
  const existing = await svc.listSellerFollows({
    seller_id: req.params.id,
    ...(body.follower_email ? { follower_email: body.follower_email } : { follower_device_id: body.follower_device_id }),
  })
  if (existing.length > 0) {
    return res.status(200).json({ id: existing[0].id, already_following: true })
  }
  const [f] = await svc.createSellerFollows([{
    seller_id: req.params.id,
    follower_email: body.follower_email || null,
    follower_phone: body.follower_phone || null,
    follower_name: body.follower_name || null,
    follower_device_id: body.follower_device_id || null,
    notify_email: body.notify_email !== false,
  }])
  res.status(201).json({ id: f.id })
}

// DELETE → unfollow
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(FOLLOWS_MODULE)
  const q = req.query as any
  const authedEmail = await authedCustomerEmail(req)
  const filter: any = { seller_id: req.params.id }
  if (authedEmail) filter.follower_email = authedEmail
  else if (q.follower_email) filter.follower_email = q.follower_email
  if (q.follower_device_id) filter.follower_device_id = q.follower_device_id
  const list = await svc.listSellerFollows(filter)
  if (list.length === 0) return res.status(404).json({ message: "Not following" })
  await svc.deleteSellerFollows(list.map((x: any) => x.id))
  res.json({ deleted: list.length })
}

// GET → check + count
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(FOLLOWS_MODULE)
  const q = req.query as any
  const authedEmail = await authedCustomerEmail(req)
  const checkEmail = authedEmail || q.follower_email
  const all = await svc.listSellerFollows({ seller_id: req.params.id })
  let isFollowing = false
  if (checkEmail || q.follower_device_id) {
    isFollowing = all.some((f: any) => f.follower_email === checkEmail || f.follower_device_id === q.follower_device_id)
  }
  res.json({ count: all.length, is_following: isFollowing })
}

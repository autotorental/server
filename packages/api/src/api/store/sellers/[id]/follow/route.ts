import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { FOLLOWS_MODULE } from "../../../../../modules/follows"

// POST → follow
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(FOLLOWS_MODULE)
  const body = req.body as any
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
  const filter: any = { seller_id: req.params.id }
  if (q.follower_email) filter.follower_email = q.follower_email
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
  const all = await svc.listSellerFollows({ seller_id: req.params.id })
  let isFollowing = false
  if (q.follower_email || q.follower_device_id) {
    isFollowing = all.some((f: any) => f.follower_email === q.follower_email || f.follower_device_id === q.follower_device_id)
  }
  res.json({ count: all.length, is_following: isFollowing })
}

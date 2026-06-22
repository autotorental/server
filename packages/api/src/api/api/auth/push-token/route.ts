import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body: any = req.body || {}
  const token = body.push_token || body.token
  if (!token) return res.status(400).json({ message: "push_token is required" })

  // Owner identity is derived from the verified auth context only. We never
  // trust body.user_id / body.seller_id, otherwise anyone could register their
  // own device against another account and hijack its push notifications.
  const auth: any = (req as any).auth_context || {}
  const actorId: string | null = auth.actor_id || null
  const actorType: string | null = auth.actor_type || null

  let userId: string | null = null
  let sellerId: string | null = null

  if (actorType === "customer" && actorId) {
    userId = actorId
  } else if (actorType === "member" && actorId) {
    const member = await pg("seller_member")
      .where({ member_id: actorId })
      .whereNull("deleted_at")
      .select("seller_id")
      .first()
    sellerId = member?.seller_id || auth?.app_metadata?.seller_id || null
  }

  const now = new Date()
  const existing = await pg("push_token").where({ token }).first()
  if (existing) {
    await pg("push_token").where({ token }).update({
      platform: body.platform || existing.platform,
      user_id: userId ?? existing.user_id,
      seller_id: sellerId ?? existing.seller_id,
      role: body.role || existing.role,
      email: body.email || existing.email,
      updated_at: now,
    })
  } else {
    await pg("push_token").insert({
      id: "pt_" + Math.random().toString(36).slice(2) + Date.now().toString(36),
      token,
      platform: body.platform || null,
      user_id: userId,
      seller_id: sellerId,
      role: body.role || null,
      email: body.email || null,
      created_at: now,
      updated_at: now,
    })
  }

  res.json({ success: true })
}

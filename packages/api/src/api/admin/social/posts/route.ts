import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { SOCIAL_MODULE } from "../../../../modules/social"

// GET /admin/social/posts — recent post history (newest first).
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const social: any = req.scope.resolve(SOCIAL_MODULE)
  const limit = Math.min(Number(req.query.limit) || 50, 200)
  const posts = await social.listSocialPosts(
    {},
    { take: limit, order: { created_at: "DESC" } }
  )
  res.json({ posts })
}

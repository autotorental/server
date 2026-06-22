import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listBlogPosts, serializePost } from "../../../../lib/blog"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const posts = await listBlogPosts(req.scope, { status: "published" })
  res.json({
    posts: posts.map(p => serializePost(p, true)),
    count: posts.length,
  })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getBlogPostBySlug, serializePost } from "../../../../../lib/blog"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const post = await getBlogPostBySlug(req.scope, req.params.slug, true)
  if (!post) return res.status(404).json({ message: "not found" })
  res.json({ post: serializePost(post, true) })
}

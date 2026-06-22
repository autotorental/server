import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getBlogPostById, serializePost, slugify } from "../../../../../lib/blog"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const post = await getBlogPostById(req.scope, req.params.id)
  if (!post) return res.status(404).json({ message: "not found" })
  res.json({ post: serializePost(post) })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const post = await getBlogPostById(req.scope, req.params.id)
  if (!post) return res.status(404).json({ message: "not found" })

  const b = req.body as any
  const patch: any = { updated_at: new Date() }

  if (b.title != null) patch.title = String(b.title).trim()
  if (b.excerpt != null) patch.excerpt = String(b.excerpt).trim() || null
  if (b.body != null) patch.body = String(b.body)
  if (b.cover_image_url != null) patch.cover_image_url = String(b.cover_image_url).trim() || null
  if (b.author_name != null) patch.author_name = String(b.author_name).trim() || null
  if (b.meta_title != null) patch.meta_title = String(b.meta_title).trim() || null
  if (b.meta_description != null) patch.meta_description = String(b.meta_description).trim() || null
  if (b.focus_keyword != null) patch.focus_keyword = String(b.focus_keyword).trim() || null
  if (b.sort_order != null) patch.sort_order = parseInt(b.sort_order, 10) || 0

  if (b.slug != null) {
    const slug = slugify(b.slug)
    if (!slug) return res.status(400).json({ message: "invalid slug" })
    const clash = await knex("blog_post").where({ slug }).whereNull("deleted_at").whereNot({ id: post.id }).first()
    if (clash) return res.status(409).json({ message: "slug already exists" })
    patch.slug = slug
  }

  if (b.status != null) {
    patch.status = b.status === "published" ? "published" : "draft"
    if (patch.status === "published" && !post.published_at && !b.published_at) {
      patch.published_at = new Date()
    }
    if (patch.status === "draft") patch.published_at = null
  }
  if (b.published_at != null) patch.published_at = b.published_at ? new Date(b.published_at) : null

  await knex("blog_post").where({ id: post.id }).update(patch)
  const updated = await getBlogPostById(req.scope, post.id)
  res.json({ post: serializePost(updated!) })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const post = await getBlogPostById(req.scope, req.params.id)
  if (!post) return res.status(404).json({ message: "not found" })
  await knex("blog_post").where({ id: post.id }).update({ deleted_at: new Date(), updated_at: new Date() })
  res.json({ id: post.id, deleted: true })
}

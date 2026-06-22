import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { listBlogPosts, newBlogId, serializePost, slugify } from "../../../../lib/blog"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const status = (req.query.status as string) || undefined
  const posts = await listBlogPosts(req.scope, { status: status === "all" ? undefined : status })
  res.json({ posts: posts.map(p => serializePost(p)) })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const b = req.body as any
  if (!b?.title?.trim()) return res.status(400).json({ message: "title required" })

  const slug = slugify(b.slug || b.title)
  if (!slug) return res.status(400).json({ message: "valid slug required" })

  const exists = await knex("blog_post").where({ slug }).whereNull("deleted_at").first()
  if (exists) return res.status(409).json({ message: "slug already exists" })

  const status = b.status === "published" ? "published" : "draft"
  const now = new Date()
  const row = {
    id: newBlogId(),
    slug,
    title: b.title.trim(),
    excerpt: b.excerpt?.trim() || null,
    body: b.body?.trim() || "",
    cover_image_url: b.cover_image_url?.trim() || null,
    status,
    published_at: status === "published" ? (b.published_at ? new Date(b.published_at) : now) : null,
    meta_title: b.meta_title?.trim() || null,
    meta_description: b.meta_description?.trim() || null,
    focus_keyword: b.focus_keyword?.trim() || null,
    author_name: b.author_name?.trim() || "Auto to Rental",
    sort_order: parseInt(b.sort_order, 10) || 0,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }

  await knex("blog_post").insert(row)
  res.status(201).json({ post: serializePost(row as any) })
}

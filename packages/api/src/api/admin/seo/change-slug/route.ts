import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { slugify } from "../../../../lib/blog"

// POST /admin/seo/change-slug  { old_path, new_slug, create_redirect }
// Only blog posts have an editable slug. Optionally creates a 301 redirect.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const b = req.body as any
  const oldPath = String(b.old_path || "").trim()
  const createRedirect = b.create_redirect !== false // default ON

  if (!oldPath.startsWith("/blog/")) {
    return res.status(400).json({ message: "Only blog post slugs can be edited." })
  }
  const oldSlug = oldPath.replace(/^\/blog\//, "").replace(/\/+$/, "")
  const newSlug = slugify(String(b.new_slug || ""))
  if (!newSlug) return res.status(400).json({ message: "Invalid new slug." })
  if (newSlug === oldSlug) return res.json({ ok: true, new_path: oldPath, unchanged: true })

  const post = await knex("blog_post").where({ slug: oldSlug }).whereNull("deleted_at").first()
  if (!post) return res.status(404).json({ message: "Blog post not found for that path." })

  const clash = await knex("blog_post").where({ slug: newSlug }).whereNull("deleted_at").whereNot({ id: post.id }).first()
  if (clash) return res.status(409).json({ message: "That slug is already used by another post." })

  const newPath = `/blog/${newSlug}`

  // 1) update the post slug
  await knex("blog_post").where({ id: post.id }).update({ slug: newSlug, updated_at: new Date() })

  // 2) migrate the SEO override row (keyed by path) if present
  try {
    const ex = await knex("seo_setting").where({ path: newPath }).first()
    if (!ex) await knex("seo_setting").where({ path: oldPath }).update({ path: newPath, updated_at: new Date() })
    else await knex("seo_setting").where({ path: oldPath }).del()
  } catch {}

  // 3) redirect bookkeeping
  if (createRedirect) {
    // re-point any existing redirects that pointed to the old path
    await knex("redirect").where({ to_path: oldPath }).update({ to_path: newPath })
    // remove a redirect that would start FROM the new path (avoid loop)
    await knex("redirect").where({ from_path: newPath }).del()
    // upsert old -> new
    await knex("redirect")
      .insert({ from_path: oldPath, to_path: newPath, status: 301 })
      .onConflict("from_path")
      .merge({ to_path: newPath, status: 301 })
  }

  res.json({ ok: true, new_path: newPath, redirect_created: createRedirect })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const slugify = (s: string) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "page"

// GET — list all CMS pages (newest first)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const pages = await pg("cms_page").select("*").orderBy("updated_at", "desc")
  res.json({ pages })
}

// POST — create (no id) or update (with id) a page
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const b = (req.body || {}) as any
  const now = new Date()

  if (b.id) {
    const updates: any = { updated_at: now }
    for (const k of ["title", "content", "meta_title", "meta_description"]) if (k in b) updates[k] = b[k]
    if ("published" in b) updates.published = !!b.published
    if (b.slug) {
      let base = slugify(b.slug)
      let slug = base
      let i = 2
      while (await pg("cms_page").where({ slug }).whereNot({ id: b.id }).first()) slug = `${base}-${i++}`
      updates.slug = slug
    }
    await pg("cms_page").where({ id: b.id }).update(updates)
    const [row] = await pg("cms_page").where({ id: b.id }).select("*")
    return res.json({ page: row })
  }

  let base = slugify(b.slug || b.title)
  let slug = base
  let i = 2
  while (await pg("cms_page").where({ slug }).first()) slug = `${base}-${i++}`
  const row = {
    id: "page_" + Math.random().toString(36).slice(2, 14) + Date.now().toString(36),
    slug,
    title: b.title || "Untitled",
    content: b.content || "",
    meta_title: b.meta_title || null,
    meta_description: b.meta_description || null,
    published: b.published === false ? false : true,
    created_at: now,
    updated_at: now,
  }
  await pg("cms_page").insert(row)
  res.json({ page: row })
}

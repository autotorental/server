import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export type BlogPostRow = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  body: string
  cover_image_url: string | null
  status: "draft" | "published"
  published_at: string | null
  meta_title: string | null
  meta_description: string | null
  focus_keyword: string | null
  author_name: string | null
  sort_order: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export function slugify(input: string): string {
  return (input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
}

export function newBlogId(): string {
  return `blog_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export async function listBlogPosts(scope: any, opts?: { status?: string; includeDeleted?: boolean }) {
  const knex: any = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  let q = knex("blog_post").select("*").orderBy([
    { column: "sort_order", order: "asc" },
    { column: "published_at", order: "desc" },
    { column: "created_at", order: "desc" },
  ])
  if (!opts?.includeDeleted) q = q.whereNull("deleted_at")
  if (opts?.status) q = q.where("status", opts.status)
  return q as Promise<BlogPostRow[]>
}

export async function getBlogPostById(scope: any, id: string) {
  const knex: any = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  return knex("blog_post").where({ id }).whereNull("deleted_at").first() as Promise<BlogPostRow | undefined>
}

export async function getBlogPostBySlug(scope: any, slug: string, publishedOnly = false) {
  const knex: any = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  let q = knex("blog_post").where({ slug: slug.toLowerCase() }).whereNull("deleted_at")
  if (publishedOnly) q = q.where("status", "published")
  return q.first() as Promise<BlogPostRow | undefined>
}

export function serializePost(row: BlogPostRow, publicView = false) {
  const base = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    cover_image_url: row.cover_image_url,
    status: row.status,
    published_at: row.published_at,
    meta_title: row.meta_title,
    meta_description: row.meta_description,
    focus_keyword: row.focus_keyword,
    author_name: row.author_name,
    sort_order: row.sort_order,
    path: `/blog/${row.slug}`,
  }
  if (publicView) {
    return {
      slug: base.slug,
      title: base.title,
      excerpt: base.excerpt,
      body: base.body,
      cover_image_url: base.cover_image_url,
      published_at: base.published_at,
      meta_title: base.meta_title || base.title,
      meta_description: base.meta_description || base.excerpt,
      author_name: base.author_name,
      path: base.path,
    }
  }
  return { ...base, created_at: row.created_at, updated_at: row.updated_at }
}

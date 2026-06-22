import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type PageSlug = "terms" | "privacy" | "cookies"

const KEY_BY_SLUG: Record<PageSlug, string> = {
  terms: "legal_page_terms_html",
  privacy: "legal_page_privacy_html",
  cookies: "legal_page_cookies_html",
}

const UPDATED_KEY_BY_SLUG: Record<PageSlug, string> = {
  terms: "legal_page_terms_updated_at",
  privacy: "legal_page_privacy_updated_at",
  cookies: "legal_page_cookies_updated_at",
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const rows = await knex("app_setting")
    .whereIn("key", [
      KEY_BY_SLUG.terms,
      KEY_BY_SLUG.privacy,
      KEY_BY_SLUG.cookies,
      UPDATED_KEY_BY_SLUG.terms,
      UPDATED_KEY_BY_SLUG.privacy,
      UPDATED_KEY_BY_SLUG.cookies,
    ])
    .select("key", "value", "updated_at")

  const map = Object.fromEntries(rows.map((r: any) => [r.key, r.value]))
  const updatedMap = Object.fromEntries(rows.map((r: any) => [r.key, r.updated_at]))

  res.json({
    pages: {
      terms: {
        slug: "terms",
        content: map[KEY_BY_SLUG.terms] || "",
        updated_at: map[UPDATED_KEY_BY_SLUG.terms] || updatedMap[KEY_BY_SLUG.terms] || null,
      },
      privacy: {
        slug: "privacy",
        content: map[KEY_BY_SLUG.privacy] || "",
        updated_at: map[UPDATED_KEY_BY_SLUG.privacy] || updatedMap[KEY_BY_SLUG.privacy] || null,
      },
      cookies: {
        slug: "cookies",
        content: map[KEY_BY_SLUG.cookies] || "",
        updated_at: map[UPDATED_KEY_BY_SLUG.cookies] || updatedMap[KEY_BY_SLUG.cookies] || null,
      },
    },
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = (req.body || {}) as { slug?: string; content?: string; updated_at?: string }

  const slug = body.slug as PageSlug
  if (slug !== "terms" && slug !== "privacy" && slug !== "cookies") {
    return res.status(400).json({ message: "slug must be terms, privacy, or cookies" })
  }

  const content = typeof body.content === "string" ? body.content : ""
  const updated = body.updated_at || new Date().toISOString().slice(0, 10)

  await knex("app_setting")
    .insert({ key: KEY_BY_SLUG[slug], value: content, is_secret: false })
    .onConflict("key")
    .merge({ value: content, updated_at: new Date() })

  await knex("app_setting")
    .insert({ key: UPDATED_KEY_BY_SLUG[slug], value: updated, is_secret: false })
    .onConflict("key")
    .merge({ value: updated, updated_at: new Date() })

  res.json({ ok: true, slug, updated_at: updated })
}

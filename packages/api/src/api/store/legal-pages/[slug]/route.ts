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
  const slug = req.params.slug as PageSlug
  if (slug !== "terms" && slug !== "privacy" && slug !== "cookies") {
    return res.status(404).json({ message: "not found" })
  }

  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const rows = await knex("app_setting")
    .whereIn("key", [KEY_BY_SLUG[slug], UPDATED_KEY_BY_SLUG[slug]])
    .select("key", "value", "updated_at")

  const map = Object.fromEntries(rows.map((r: any) => [r.key, r.value]))
  const updatedMap = Object.fromEntries(rows.map((r: any) => [r.key, r.updated_at]))

  res.json({
    page: {
      slug,
      content: map[KEY_BY_SLUG[slug]] || "",
      updated_at: map[UPDATED_KEY_BY_SLUG[slug]] || updatedMap[KEY_BY_SLUG[slug]] || null,
    },
  })
}

// Server-side helper to fetch SEO overrides set in admin and merge with defaults.
import { buildMetadata as _build, SITE } from "./seo"
import { getLocale } from "./locale-server"
import { translateBatch } from "./mt"

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.autotorental.com"
const KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

async function getOverride(path: string) {
  try {
    const r = await fetch(`${API}/store/seo?path=${encodeURIComponent(path)}`, {
      headers: { "x-publishable-api-key": KEY },
      next: { revalidate: 60 },
    })
    if (!r.ok) return null
    const d = await r.json()
    return d.seo as { title?: string; description?: string; focus_keyword?: string; og_image?: string; noindex?: boolean } | null
  } catch { return null }
}

// Merge admin override with the default buildMetadata input
export async function seoFor(path: string, defaults: { title: string; description: string; image?: string; keywords?: string[]; noindex?: boolean }) {
  const [ovr, locale] = await Promise.all([getOverride(path), getLocale()])
  const baseTitle = ovr?.title || defaults.title
  const baseDesc = ovr?.description || defaults.description
  // Localize title + description per visitor locale so every language URL has a
  // UNIQUE translated <title>/<meta description> (kills cross-locale "duplicate
  // title/description" flags). translateBatch is a no-op for the default locale.
  const [tTitle, tDesc] = await translateBatch([baseTitle, baseDesc], locale)
  return _build({
    title: tTitle || baseTitle,
    description: tDesc || baseDesc,
    path,
    locale,
    image: ovr?.og_image || defaults.image,
    keywords: ovr?.focus_keyword ? [ovr.focus_keyword, ...(defaults.keywords || [])] : defaults.keywords,
    noindex: ovr?.noindex || (defaults as any)?.noindex || false,
  })
}

// Fetch admin-defined custom JSON-LD for a path (validated as JSON on save). Returns raw string or null.
export async function customSchemaFor(path: string): Promise<string | null> {
  const ovr = await getOverride(path) as any
  const raw = ovr?.custom_schema
  if (!raw || typeof raw !== "string" || raw.trim() === "") return null
  try { JSON.parse(raw); return raw } catch { return null }
}

// Re-export for convenience
export { SITE } from "./seo"

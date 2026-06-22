import { api } from "@/lib/api"
import { POSTS } from "@/lib/blog-posts"
import { STARTER_SEO_INTENT_PAGES, getSeoIntentPath } from "@/lib/seo-intent-pages"
import { LOCALES, DEFAULT_LOCALE, localizedPath } from "@/lib/locales"

// Revalidate every 5 min — sitemap is heavy; this prevents thundering-herd on Google bot.
export const revalidate = 300

const SITE = "https://autotorental.com"

type ChangeFreq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"

type SitemapEntry = {
  path: string
  lastModified: Date
  changeFrequency: ChangeFreq
  priority: number
  images?: { loc: string; title?: string; caption?: string }[]
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

async function buildEntries(): Promise<SitemapEntry[]> {
  const now = new Date()

  // Tier 1 — landing / commercial intent pages (highest priority)
  const tier1Static: { path: string; freq: ChangeFreq; prio: number }[] = [
    { path: "",                              freq: "hourly",  prio: 1.0  },
    { path: "/cars",                         freq: "hourly",  prio: 0.95 },
    { path: "/car-rental-dubai",             freq: "daily",   prio: 0.95 },
    { path: "/car-rental-dubai-airport",      freq: "daily",   prio: 0.93 },
    { path: "/rent-a-car-dubai",             freq: "daily",   prio: 0.95 },
    { path: "/luxury-car-rental-dubai",      freq: "daily",   prio: 0.92 },
    { path: "/monthly-car-rental-dubai",     freq: "daily",   prio: 0.90 },
    { path: "/weekly-car-rental-dubai",      freq: "daily",   prio: 0.90 },
    { path: "/daily-car-rental-dubai",       freq: "daily",   prio: 0.90 },
    { path: "/brands",                       freq: "weekly",  prio: 0.85 },
    { path: "/companies",                    freq: "weekly",  prio: 0.85 },
    { path: "/blog",                         freq: "weekly",  prio: 0.80 },
    { path: "/list-your-car",                freq: "weekly",  prio: 0.80 },
    { path: "/about",                        freq: "monthly", prio: 0.60 },
    { path: "/contact",                      freq: "monthly", prio: 0.60 },
    { path: "/help",                         freq: "monthly", prio: 0.55 },
    { path: "/privacy",                      freq: "yearly",  prio: 0.30 },
    { path: "/terms",                        freq: "yearly",  prio: 0.30 },
    { path: "/cookies",                      freq: "yearly",  prio: 0.30 },
  ]
  const staticPages: SitemapEntry[] = tier1Static.map(s => ({
    path: s.path, lastModified: now, changeFrequency: s.freq, priority: s.prio,
  }))

  const [v, b, c, s, bt] = await Promise.all([
    api.vehicles({ limit: 5000 }).catch(() => ({ vehicles: [] as any[] })),
    api.brands().catch(() => ({ brands: [] as any[] })),
    api.cities().catch(() => ({ cities: [] as any[] })),
    api.sellers().catch(() => ({ sellers: [] as any[] })),
    api.body_types().catch(() => ({ body_types: [] as any[] })),
  ])

  // Vehicle pages — with image entries (huge boost for Google Images / Lens)
  const vehiclePages: SitemapEntry[] = v.vehicles.map((x: any) => {
    const photos: string[] = Array.isArray(x.photos) ? x.photos.filter(Boolean) : []
    const images = photos.slice(0, 5).map((url: string) => ({
      loc: url,
      title: x.title || "Luxury car for rent",
      caption: x.description ? String(x.description).slice(0, 160) : x.title,
    }))
    return {
      path: `/cars/${x.slug || x.id}`,
      lastModified: new Date(x.updated_at || x.created_at || now),
      changeFrequency: "daily" as ChangeFreq,
      priority: 0.90,
      images: images.length ? images : undefined,
    }
  })

  const brandPages: SitemapEntry[] = b.brands
    .filter((x: any) => x.slug)
    .map((x: any) => ({
      path: `/cars/brand/${x.slug}`,
      lastModified: new Date(x.updated_at || now),
      changeFrequency: "weekly", priority: 0.85,
    }))

  const cityPages: SitemapEntry[] = c.cities
    .filter((x: any) => x.slug)
    .map((x: any) => ({
      path: `/cars/city/${x.slug}`,
      lastModified: new Date(x.updated_at || now),
      changeFrequency: "daily", priority: 0.88,
    }))

  const bodyTypePages: SitemapEntry[] = (bt.body_types || [])
    .filter((x: any) => x.slug || x.name)
    .map((x: any) => ({
      path: `/vehicle-category/${x.slug || String(x.name).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      lastModified: now,
      changeFrequency: "weekly", priority: 0.82,
    }))

  const companyPages: SitemapEntry[] = s.sellers.map((x: any) => ({
    path: `/companies/${x.handle || x.id}`,
    lastModified: new Date(x.updated_at || now),
    changeFrequency: "weekly", priority: 0.70,
  }))

  // Blog posts — WEEKLY change frequency (per request) for faster Google re-crawl
  const blogPages: SitemapEntry[] = POSTS.map((post) => ({
    path: `/blog/${post.slug}`,
    lastModified: new Date(post.updated_at),
    changeFrequency: "weekly", priority: 0.78,
  }))

  // Only list intent pages that actually have matching inventory (city+brand), so we
  // never put a thin/empty (and now noindex'd) combo page in the sitemap.
  const brandIdBySlug = new Map((b.brands || []).map((x: any) => [x.slug, x.id]))
  const cityIdBySlug = new Map((c.cities || []).map((x: any) => [x.slug, x.id]))
  const inventorySet = new Set((v.vehicles || []).map((veh: any) => `${veh.brand_id}|${veh.city_id}`))
  const intentPages: SitemapEntry[] = STARTER_SEO_INTENT_PAGES
    .filter((page) => {
      const bid = brandIdBySlug.get(page.brandSlug)
      const cid = cityIdBySlug.get(page.citySlug)
      return bid && cid && inventorySet.has(`${bid}|${cid}`)
    })
    .map((page) => ({
      path: getSeoIntentPath(page),
      lastModified: now,
      changeFrequency: "weekly", priority: 0.80,
    }))

  // CMS pages
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.autotorental.com"
  const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""
  let cmsList: any[] = []
  try {
    const rp = await fetch(`${API_BASE}/store/pages`, { headers: PK ? { "x-publishable-api-key": PK } : {}, next: { revalidate: 300 } })
    if (rp.ok) cmsList = (await rp.json())?.pages || []
  } catch {}
  const cmsPages: SitemapEntry[] = cmsList.map((x: any) => ({
    path: `/p/${x.slug}`,
    lastModified: new Date(x.updated_at || now),
    changeFrequency: "monthly", priority: 0.55,
  }))

  // Order matters for some crawlers — put highest priority first
  return [
    ...staticPages,
    ...vehiclePages,
    ...cityPages,
    ...brandPages,
    ...bodyTypePages,
    ...intentPages,
    ...blogPages,
    ...companyPages,
    ...cmsPages,
  ]
}

function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const abs = (loc: typeof LOCALES[number]) => {
        const lp = localizedPath(entry.path, loc)
        return SITE + (lp === "/" ? "" : lp)
      }
      const alternates = LOCALES.map(
        (loc) =>
          `<xhtml:link rel="alternate" hreflang="${loc}" href="${escapeXml(abs(loc))}"/>`,
      ).join("\n")
      const xDefault = `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(abs(DEFAULT_LOCALE))}"/>`

      // Image sitemap entries for vehicle pages — Google Images / Lens SEO boost
      const imageBlocks = (entry.images || [])
        .map(img => {
          const parts = [`<image:loc>${escapeXml(img.loc)}</image:loc>`]
          if (img.title)   parts.push(`<image:title>${escapeXml(img.title)}</image:title>`)
          if (img.caption) parts.push(`<image:caption>${escapeXml(img.caption)}</image:caption>`)
          return `<image:image>\n${parts.join("\n")}\n</image:image>`
        })
        .join("\n")

      return `<url>
<loc>${escapeXml(abs(DEFAULT_LOCALE))}</loc>
<lastmod>${entry.lastModified.toISOString()}</lastmod>
<changefreq>${entry.changeFrequency}</changefreq>
<priority>${entry.priority.toFixed(2)}</priority>
${alternates}
${xDefault}${imageBlocks ? "\n" + imageBlocks : ""}
</url>`
    })
    .join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`
}

export async function GET() {
  const entries = await buildEntries()
  const body = buildSitemapXml(entries)

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Cache for 1 hour at CDN, allow stale-while-revalidate for 24h
      // — keeps Google bot fast without serving stale data after content changes
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  })
}

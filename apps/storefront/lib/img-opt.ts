/**
 * Smart image optimization helper for the storefront.
 * - Contentful images (images.ctfassets.net): uses their built-in transformation API
 *   to resize + convert to WebP — zero extra infrastructure needed.
 * - Our API static images (api.autotorental.com/static): already WebP (converted by sharp on upload)
 * - Other external images: pass through Next.js image optimization via /_next/image
 */
export function optimizeImageUrl(
  src: string | null | undefined,
  opts: { w?: number; h?: number; q?: number } = {}
): string {
  if (!src) return ""
  const { w = 900, h, q = 75 } = opts

  try {
    const url = new URL(src)

    // Contentful CDN → use their Image API (free, no setup)
    if (url.hostname === "images.ctfassets.net" || url.hostname.endsWith(".ctfassets.net")) {
      url.searchParams.set("w", String(w))
      if (h) url.searchParams.set("h", String(h))
      url.searchParams.set("fm", "webp")
      url.searchParams.set("q", String(q))
      url.searchParams.set("fit", "fill")
      return url.toString()
    }

    // Our own static files already go through sharp → already WebP
    if (url.hostname === "api.autotorental.com") return src

    // Any other external image → proxy via Next.js image optimiser
    return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${q}`
  } catch {
    return src
  }
}

/** Thumbnail variant (small card image ~400px wide) */
export const thumbUrl = (src: string | null | undefined) =>
  optimizeImageUrl(src, { w: 400, h: 280, q: 70 })

/** Gallery/detail variant (full-size ~900px wide) */
export const galleryUrl = (src: string | null | undefined) =>
  optimizeImageUrl(src, { w: 900, q: 78 })

/** Gallery zoom (high quality ~1400px wide) */
export const zoomUrl = (src: string | null | undefined) =>
  optimizeImageUrl(src, { w: 1400, q: 85 })

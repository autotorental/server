// Machine translation for dynamic DB content (vehicle descriptions, seller bios).
// Uses Google Cloud Translation v2 REST API. The API key is read from the server
// environment variable GOOGLE_TRANSLATE_API_KEY (set on the VPS, never committed).
// If no key is configured, or the call fails, the original text is returned
// unchanged (graceful English fallback). Results are cached by Next's fetch
// cache for 7 days so each unique string is translated at most once per period.
import { Locale, DEFAULT_LOCALE } from "./locales"

const KEY = process.env.GOOGLE_TRANSLATE_API_KEY || ""

// Map our locale codes to Google Translate target codes (mostly identical).
const TARGET: Record<Locale, string> = {
  en: "en",
  ar: "ar",
  es: "es",
  zh: "zh-CN",
  th: "th",
  ru: "ru",
  ur: "ur",
}

/**
 * Translate a single block of text into the given locale.
 * `format` is "text" (plain) or "html" (preserves markup/tags — use for
 * rich CMS / blog bodies rendered via dangerouslySetInnerHTML).
 * Returns the original text for English, when no key is set, on error,
 * or for empty input. Failed API responses are NOT cached, so a transient
 * error (or a key that gets fixed later) recovers on the next request.
 */
export async function translateText(
  text: string | null | undefined,
  locale: Locale,
  format: "text" | "html" = "text",
): Promise<string> {
  const src = (text || "").trim()
  if (!src) return src
  if (locale === DEFAULT_LOCALE) return src
  if (!KEY) return src

  try {
    const r = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: src, target: TARGET[locale], format }),
      // Cache aggressively: same string + same locale rarely changes.
      next: { revalidate: 60 * 60 * 24 * 7 },
    })
    if (!r.ok) return src
    const d = await r.json()
    const out = d?.data?.translations?.[0]?.translatedText
    return typeof out === "string" && out.trim() ? out : src
  } catch {
    return src
  }
}

/** Convenience wrapper for rich HTML content. */
export function translateHtml(html: string | null | undefined, locale: Locale): Promise<string> {
  return translateText(html, locale, "html")
}

/**
 * Translate many plain-text strings in one batch (single API call) for the
 * given locale. Preserves order. Falls back to the originals on any failure.
 * Empty/blank entries and English are returned unchanged. Use for lists of
 * short strings (e.g. tags, city names, amenity labels).
 */
export async function translateBatch(texts: (string | null | undefined)[], locale: Locale): Promise<string[]> {
  const srcs = texts.map((t) => (t || "").trim())
  if (locale === DEFAULT_LOCALE || !KEY) return srcs
  // Only send non-empty entries; map results back by index.
  const idx: number[] = []
  const q: string[] = []
  srcs.forEach((s, i) => { if (s) { idx.push(i); q.push(s) } })
  if (q.length === 0) return srcs
  try {
    const r = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q, target: TARGET[locale], format: "text" }),
      next: { revalidate: 60 * 60 * 24 * 7 },
    })
    if (!r.ok) return srcs
    const d = await r.json()
    const tr = d?.data?.translations
    if (!Array.isArray(tr)) return srcs
    const out = [...srcs]
    idx.forEach((target, k) => {
      const t = tr[k]?.translatedText
      if (typeof t === "string" && t.trim()) out[target] = t
    })
    return out
  } catch {
    return srcs
  }
}

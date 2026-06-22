// Server-side locale access. The middleware sets `x-locale` (the active locale,
// derived from the URL prefix) and `x-pathname` (the ORIGINAL request path including
// any locale prefix) on every request. Server components / metadata read them here.
import { headers } from "next/headers"
import { DEFAULT_LOCALE, isLocale, splitLocale, type Locale } from "./locales"

// Active locale for the current request.
export async function getLocale(): Promise<Locale> {
  try {
    const h = await headers()
    const l = h.get("x-locale")
    if (isLocale(l)) return l
    // Fallback: derive from x-pathname if header missing.
    const p = h.get("x-pathname")
    if (p) return splitLocale(p).locale
  } catch {}
  return DEFAULT_LOCALE
}

// Original pathname (with locale prefix) and the locale-stripped path.
export async function getPathInfo(): Promise<{ locale: Locale; pathname: string; rest: string }> {
  let pathname = "/"
  try {
    const h = await headers()
    pathname = h.get("x-pathname") || "/"
  } catch {}
  const { locale, rest } = splitLocale(pathname)
  return { locale, pathname, rest }
}

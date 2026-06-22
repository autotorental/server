// Next.js middleware:
//  1) Locale routing: non-default locales are served under a path prefix (/ar, /es,
//     /zh, /th, /ru, /ur). We strip the prefix and rewrite to the shared single app
//     tree, passing the active locale via the `x-locale` header and keeping the
//     original path in `x-pathname` (for canonical/hreflang + custom JSON-LD).
//     The `lang` cookie is kept in sync so client components know the locale too.
//  2) 301 redirects from old query-param URLs to clean slug URLs (duplicate-content fix)
//  3) sets x-pathname on every request so the root layout can inject per-path JSON-LD
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { DEFAULT_LOCALE, splitLocale, type Locale } from "./lib/locales"

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.autotorental.com"
const KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

// Tiny in-memory cache (per-process) of id → slug — refreshed on each cold start
let brandMap: Record<string, string> | null = null
let cityMap: Record<string, string> | null = null
let lastFetch = 0
let redirectMap: Record<string, { to: string; status: number }> | null = null
let lastRedirFetch = 0

async function loadRedirects() {
  if (redirectMap && Date.now() - lastRedirFetch < 120_000) return // 2 min TTL
  try {
    const r = await fetch(`${API}/store/redirects`, { headers: { "x-publishable-api-key": KEY } })
    const d = await r.json()
    const m: Record<string, { to: string; status: number }> = {}
    for (const it of (d.redirects || [])) if (it.from && it.to) m[it.from] = { to: it.to, status: it.status || 301 }
    redirectMap = m
    lastRedirFetch = Date.now()
  } catch {}
}

async function loadMaps() {
  if (brandMap && cityMap && Date.now() - lastFetch < 600_000) return // 10 min TTL
  try {
    const headers = { "x-publishable-api-key": KEY }
    const [bR, cR] = await Promise.all([
      fetch(`${API}/store/catalog/brands?limit=200`, { headers }),
      fetch(`${API}/store/locations/cities?limit=200`, { headers }),
    ])
    const bData = await bR.json()
    const cData = await cR.json()
    brandMap = {}
    cityMap = {}
    for (const b of (bData.brands || [])) if (b.slug) brandMap[b.id] = b.slug
    for (const c of (cData.cities || [])) if (c.slug) cityMap[c.id] = c.slug
    lastFetch = Date.now()
  } catch {}
}

// Build the response that rewrites to the locale-stripped path and carries locale
// context. `originalPath` includes the prefix; `rest` is the path the app sees.
function localizedResponse(req: NextRequest, locale: Locale, rest: string, originalPath: string) {
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-pathname", originalPath)
  requestHeaders.set("x-locale", locale)

  let res: NextResponse
  if (locale === DEFAULT_LOCALE || rest === originalPath) {
    // No rewrite needed (default locale lives at root).
    res = NextResponse.next({ request: { headers: requestHeaders } })
  } else {
    const url = req.nextUrl.clone()
    url.pathname = rest
    res = NextResponse.rewrite(url, { request: { headers: requestHeaders } })
  }
  // Keep the client `lang` cookie in sync with the URL-derived locale.
  if (req.cookies.get("lang")?.value !== locale) {
    res.cookies.set("lang", locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" })
  }
  return res
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl

  // English is the default locale and lives at the site root — there is no /en tree.
  // 301 any stray /en or /en/* request to the bare root path so we never serve a
  // duplicate URL or a 404 for the default language.
  if (url.pathname === "/en" || url.pathname.startsWith("/en/")) {
    const stripped = url.pathname.slice(3) || "/"
    return NextResponse.redirect(new URL(`${stripped}${url.search}`, url), 301)
  }

  const { locale, rest } = splitLocale(url.pathname)

  // Custom 301 redirects (e.g. blog slug changed in SEO Manager). Match on the
  // locale-stripped path; preserve locale prefix + query on the target.
  await loadRedirects()
  const hit = redirectMap?.[rest]
  if (hit) {
    const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`
    return NextResponse.redirect(new URL(`${prefix}${hit.to}${url.search}`, url), hit.status === 302 ? 302 : 301)
  }

  // Clean-URL redirects only apply to the (locale-stripped) /cars path with a single
  // brand/city filter. Preserve the locale prefix on the redirect target.
  if (rest === "/cars") {
    const brand = url.searchParams.get("brand")
    const city = url.searchParams.get("city")
    const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`
    if (brand && !city) {
      await loadMaps()
      if (brandMap?.[brand]) return NextResponse.redirect(new URL(`${prefix}/cars/brand/${brandMap[brand]}`, url), 301)
    }
    if (city && !brand) {
      await loadMaps()
      if (cityMap?.[city]) return NextResponse.redirect(new URL(`${prefix}/cars/city/${cityMap[city]}`, url), 301)
    }
  }

  return localizedResponse(req, locale, rest, url.pathname)
}

export const config = {
  // Run on all routes except Next internals, API, and static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|json|js|css|woff2?)$).*)"],
}

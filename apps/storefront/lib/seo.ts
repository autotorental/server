import type { Metadata } from "next"
import { DEFAULT_LOCALE, LOCALE_INFO, LOCALES, localizedPath, type Locale } from "./locales"

export const SITE = {
  name: "Auto to Rental",
  url: "https://autotorental.com",
  description: "Car rental marketplace in UAE and Syria. Browse 1,200+ vehicles from verified rental companies. Daily, weekly, monthly rates. No commission, no booking fees.",
  defaultOG: "https://autotorental.com/og-default.jpg",
  twitter: "@autotorental",
}

// Build the hreflang alternates map for a locale-stripped path.
// Google requires every language version to reference all others (incl. self) plus
// an x-default. English (the default locale) is the x-default.
export function hreflangFor(path: string): { canonicalLocaleUrls: Record<string, string>; xDefault: string } {
  const clean = path === "" ? "/" : path
  const canonicalLocaleUrls: Record<string, string> = {}
  for (const loc of LOCALES) {
    canonicalLocaleUrls[LOCALE_INFO[loc].hreflang] = `${SITE.url}${localizedPath(clean, loc)}`
  }
  return { canonicalLocaleUrls, xDefault: `${SITE.url}${localizedPath(clean, DEFAULT_LOCALE)}` }
}

export function buildMetadata(input: {
  title: string
  description: string
  // Locale-stripped path, e.g. "/cars/brand/bmw" (no language prefix).
  path?: string
  // Active locale for THIS render. Defaults to English.
  locale?: Locale
  image?: string
  noindex?: boolean
  keywords?: string[]
}): Metadata {
  const locale = input.locale || DEFAULT_LOCALE
  const fullTitle = input.title.includes("Auto to Rental") ? input.title : `${input.title} | ${SITE.name}`
  const path = input.path || "/"
  // Canonical points at THIS locale's URL (self-referencing canonical per locale).
  const url = `${SITE.url}${localizedPath(path, locale)}`
  const image = input.image || SITE.defaultOG
  const { canonicalLocaleUrls, xDefault } = hreflangFor(path)
  return {
    description: input.description,
    keywords: input.keywords?.join(", "),
    metadataBase: new URL(SITE.url),
    title: { absolute: fullTitle },
    alternates: {
      canonical: url,
      // hreflang ONLY on indexable pages. A noindex page must not reference itself
      // or other (noindex) locale variants via hreflang — that is exactly the
      // "hreflang conflicts within page source code" SEMrush flags.
      ...(input.noindex ? {} : { languages: { ...canonicalLocaleUrls, "x-default": xDefault } }),
    },
    robots: input.noindex ? { index: false, follow: true } : { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    openGraph: {
      title: fullTitle,
      description: input.description,
      url,
      siteName: SITE.name,
      images: [{ url: image, width: 1200, height: 630 }],
      type: "website",
      locale: LOCALE_INFO[locale].ogLocale,
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => LOCALE_INFO[l].ogLocale),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: input.description,
      site: SITE.twitter,
      images: [image],
    },
  }
}

export const SEO_KEYWORDS = {
  general: [
    "car rental UAE", "rent a car UAE", "car hire UAE", "rental cars UAE",
    "car rental Dubai", "rent a car Dubai", "rent car Dubai", "car hire Dubai",
    "monthly car rental Dubai", "luxury car rental Dubai", "sports car rental Dubai",
    "car rental marketplace", "compare car rental",
    "car rental Abu Dhabi", "car rental Sharjah", "car rental Syria", "car rental Damascus",
  ],
}

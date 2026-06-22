// Central locale configuration for the multilingual storefront.
// English is the DEFAULT locale and lives at the site root (no URL prefix) so all
// existing indexed URLs (autotorental.com/cars, /brands/x ...) keep their rankings.
// Every other locale is served under a path prefix: /ar, /es, /zh, /th, /ru, /ur.
//
// This single file is the source of truth used by the middleware, the root layout,
// the metadata/hreflang builder, the sitemap and the language switcher.

export type Locale = "en" | "ar" | "es" | "zh" | "th" | "ru" | "ur"

export const DEFAULT_LOCALE: Locale = "en"

export const LOCALES: Locale[] = ["en", "ar", "es", "zh", "th", "ru", "ur"]

// Non-default locales that carry a URL prefix.
export const PREFIXED_LOCALES: Locale[] = LOCALES.filter((l) => l !== DEFAULT_LOCALE)

export type LocaleInfo = {
  code: Locale
  // Native name shown in the language switcher.
  label: string
  // English name (for aria/debug).
  englishName: string
  flag: string
  dir: "ltr" | "rtl"
  // BCP-47 tag used for <html lang> and hreflang.
  hreflang: string
  // Open Graph locale (language_TERRITORY).
  ogLocale: string
}

export const LOCALE_INFO: Record<Locale, LocaleInfo> = {
  en: { code: "en", label: "English",  englishName: "English", flag: "🇬🇧", dir: "ltr", hreflang: "en", ogLocale: "en_AE" },
  ar: { code: "ar", label: "العربية",  englishName: "Arabic",  flag: "🇦🇪", dir: "rtl", hreflang: "ar", ogLocale: "ar_AE" },
  es: { code: "es", label: "Español",  englishName: "Spanish", flag: "🇪🇸", dir: "ltr", hreflang: "es", ogLocale: "es_ES" },
  zh: { code: "zh", label: "中文",      englishName: "Chinese", flag: "🇨🇳", dir: "ltr", hreflang: "zh", ogLocale: "zh_CN" },
  th: { code: "th", label: "ไทย",       englishName: "Thai",    flag: "🇹🇭", dir: "ltr", hreflang: "th", ogLocale: "th_TH" },
  ru: { code: "ru", label: "Русский",  englishName: "Russian", flag: "🇷🇺", dir: "ltr", hreflang: "ru", ogLocale: "ru_RU" },
  ur: { code: "ur", label: "اردو",      englishName: "Urdu",    flag: "🇵🇰", dir: "rtl", hreflang: "ur", ogLocale: "ur_PK" },
}

export function isLocale(x: string | undefined | null): x is Locale {
  return !!x && (LOCALES as string[]).includes(x)
}

// Given a pathname, return the locale encoded in its prefix (or the default) plus
// the pathname with that prefix removed. Used by middleware + helpers.
//   "/ar/cars"  -> { locale: "ar", rest: "/cars" }
//   "/cars"     -> { locale: "en", rest: "/cars" }
//   "/ar"       -> { locale: "ar", rest: "/" }
export function splitLocale(pathname: string): { locale: Locale; rest: string } {
  const seg = pathname.split("/")[1] || ""
  if (isLocale(seg) && seg !== DEFAULT_LOCALE) {
    const rest = pathname.slice(seg.length + 1) || "/"
    return { locale: seg as Locale, rest: rest.startsWith("/") ? rest : `/${rest}` }
  }
  return { locale: DEFAULT_LOCALE, rest: pathname || "/" }
}

// Build a locale-prefixed href. English stays bare; others get the prefix.
//   localizedPath("/cars", "ar") -> "/ar/cars"
//   localizedPath("/cars", "en") -> "/cars"
export function localizedPath(path: string, locale: Locale): string {
  const clean = path.startsWith("/") ? path : `/${path}`
  if (locale === DEFAULT_LOCALE) return clean
  if (clean === "/") return `/${locale}`
  return `/${locale}${clean}`
}

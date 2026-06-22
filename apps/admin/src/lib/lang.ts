// Detects the admin UI language so our custom pages/labels can show Arabic.
// Robust: checks <html lang/dir>, any localStorage i18n key, then navigator.
let _lang: string | null = null
export function getLang(): string {
  if (_lang) return _lang
  let lng = "en"
  try {
    const h = typeof document !== "undefined" ? document.documentElement : null
    if (h && (String(h.lang || "").toLowerCase().startsWith("ar") || h.dir === "rtl")) lng = "ar"
    else if (typeof localStorage !== "undefined") {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || ""
        if (/lng|lang|locale|i18n/i.test(k)) {
          const v = String(localStorage.getItem(k) || "").toLowerCase()
          if (v.startsWith("ar")) { lng = "ar"; break }
          if (v.startsWith("en")) { lng = "en"; break }
        }
      }
    }
    if (lng === "en" && typeof navigator !== "undefined" && String(navigator.language || "").toLowerCase().startsWith("ar")) lng = "ar"
  } catch { /* ignore */ }
  _lang = lng
  return lng
}
export const isAr = (): boolean => getLang().startsWith("ar")
export const tt = (en: string, ar: string): string => (isAr() ? ar : en)

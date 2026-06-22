"use client"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { splitLocale, localizedPath, isLocale, DEFAULT_LOCALE, type Locale } from "./locales"

export type Lang = Locale
export type Ccy = "AED" | "SYP" | "USD" | "EUR" | "GBP"

export const RATES: Record<Ccy, number> = { AED: 1, SYP: 350, USD: 0.272, EUR: 0.25, GBP: 0.215 }
export const SYMBOL: Record<Ccy, string> = { AED: "AED", SYP: "SYP", USD: "$", EUR: "€", GBP: "£" }

export const DECIMALS: Record<Ccy, number> = { AED: 0, SYP: 0, USD: 2, EUR: 2, GBP: 2 }

function roundTo(value: number, decimals: number) {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

export function convert(amt?: number, from: Ccy = "AED", to: Ccy = "AED"): number | undefined {
  if (amt == null) return undefined
  if (from === to) return amt
  const inAed = amt / (RATES[from] || 1)
  const out = inAed * (RATES[to] || 1)
  return roundTo(out, DECIMALS[to] ?? 0)
}

function readCookie(k: string): string | undefined {
  if (typeof document === "undefined") return undefined
  const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`))
  const v = m?.[1]
  if (v == null) return undefined
  try {
    return decodeURIComponent(v)
  } catch {
    return v
  }
}
function writeCookie(k: string, v: string) {
  document.cookie = `${k}=${encodeURIComponent(v)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
}

// Locale is now driven by the URL prefix (/ar, /es, …). The hook reads the active
// locale from the current pathname and switches language by navigating to the
// locale-prefixed version of the same page, so the server re-renders translated
// content with correct hreflang/canonical. The `lang` cookie is kept in sync too.
export function useLang(): [Lang, (v: Lang) => void] {
  const pathname = usePathname() || "/"
  const router = useRouter()
  const { locale, rest } = splitLocale(pathname)
  return [locale, (v) => { writeCookie("lang", v); router.push(localizedPath(rest, v)) }]
}
export function useCcy(): [Ccy, (v: Ccy) => void] {
  const [c, setC] = useState<Ccy>("AED")
  useEffect(() => {
    const fromCookie = readCookie("ccy") as Ccy | undefined
    if (fromCookie && ["AED","SYP","USD","EUR","GBP"].includes(fromCookie)) {
      setC(fromCookie)
      return
    }
    const country = readCookie("country")
    const fallback: Ccy = country === "sy" ? "SYP" : "AED"
    writeCookie("ccy", fallback)
    setC(fallback)
  }, [])
  return [c, (v) => { writeCookie("ccy", v); setC(v); window.location.reload() }]
}

// Server-side helpers
export function readServerLang(c: any): Lang { const v = c.get?.("lang")?.value; return isLocale(v) ? v : DEFAULT_LOCALE }
export function readServerCcy(c: any): Ccy { const v = c.get?.("ccy")?.value as Ccy; return ["AED","SYP","USD","EUR","GBP"].includes(v) ? v : "AED" }

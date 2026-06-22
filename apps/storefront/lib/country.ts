"use client"
import { useEffect, useState } from "react"

// International: any ISO-3166 alpha-2 code (lowercase). Based in UAE (default "ae").
export type Country = string

export function getCountry(): Country {
  if (typeof document === "undefined") return "ae"
  const m = document.cookie.match(/country=([a-z]{2})/)
  return (m?.[1] as Country) || "ae"
}
export function setCountry(c: Country) {
  document.cookie = `country=${c}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
}
export function useCountry(): [Country, (c: Country) => void] {
  const [c, setC] = useState<Country>("ae")
  useEffect(() => { setC(getCountry()) }, [])
  const set = (v: Country) => { setCountry(v); setC(v); window.location.reload() }
  return [c, set]
}

// Flag emoji from any 2-letter code (regional-indicator letters).
export function countryFlag(code: string): string {
  const cc = (code || "").toUpperCase()
  if (!/^[A-Z]{2}$/.test(cc)) return "🌐"
  return String.fromCodePoint(...[...cc].map((ch) => 127397 + ch.charCodeAt(0)))
}

const NAME_OVERRIDES: Record<string, string> = {
  AE: "United Arab Emirates", SY: "Syria", SA: "Saudi Arabia", GB: "United Kingdom", US: "United States",
}
export function countryLabel(code: string): string {
  const cc = (code || "").toUpperCase()
  if (NAME_OVERRIDES[cc]) return NAME_OVERRIDES[cc]
  try {
    const dn = new (Intl as any).DisplayNames(["en"], { type: "region" })
    return dn.of(cc) || cc
  } catch {
    return cc
  }
}

const CCY_MAP: Record<string, string> = {
  AE: "AED", SY: "SYP", SA: "SAR", QA: "QAR", KW: "KWD", OM: "OMR", BH: "BHD",
  EG: "EGP", JO: "JOD", LB: "LBP", IQ: "IQD", TR: "TRY", GB: "GBP", US: "USD",
  EU: "EUR", FR: "EUR", DE: "EUR", IT: "EUR", ES: "EUR", IN: "INR", PK: "PKR",
}
export function countryCurrency(code: string): string {
  return CCY_MAP[(code || "").toUpperCase()] || "USD"
}

// Back-compat: COUNTRY_FLAG[code] / COUNTRY_LABEL[code] / COUNTRY_CCY[code] for any code.
export const COUNTRY_FLAG = new Proxy({}, { get: (_t, k) => countryFlag(String(k)) }) as Record<string, string>
export const COUNTRY_LABEL = new Proxy({}, { get: (_t, k) => countryLabel(String(k)) }) as Record<string, string>
export const COUNTRY_CCY = new Proxy({}, { get: (_t, k) => countryCurrency(String(k)) }) as Record<string, string>

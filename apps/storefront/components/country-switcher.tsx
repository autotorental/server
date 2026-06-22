"use client"
import { useCountry, countryFlag, countryLabel } from "@/lib/country"
import { ChevronDown, X } from "lucide-react"
import { useEffect, useState } from "react"

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.autotorental.com"
const KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

// International: only offer countries that actually have at least one LISTED
// car. A visitor can't pick a country with no listings (e.g. Syria stays hidden
// until a car is listed there). Falls back to the home market + current country
// so the switcher is never empty.
export default function CountrySwitcher({ compact }: { compact?: boolean }) {
  const [country, set] = useCountry()
  const [open, setOpen] = useState(false)
  const [codes, setCodes] = useState<string[]>(["ae"])

  useEffect(() => {
    let alive = true
    fetch(`${API}/store/locations/active-countries`, { headers: { "x-publishable-api-key": KEY } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return
        const withCars: string[] = Array.isArray(d?.countries)
          ? d.countries.map((x: string) => String(x).toLowerCase()).filter((x: string) => /^[a-z]{2}$/.test(x))
          : []
        // Always keep the currently selected country visible (so the active
        // selection never disappears), plus the home market as a safe fallback.
        const found = new Set<string>(withCars)
        if (country) found.add(country)
        if (found.size === 0) found.add("ae")
        const list = Array.from(found).sort((a, b) =>
          a === "ae" ? -1 : b === "ae" ? 1 : countryLabel(a).localeCompare(countryLabel(b))
        )
        setCodes(list)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [country])

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className={`inline-flex items-center gap-1.5 ${compact ? "text-[11px]" : "text-sm"} font-medium hover:text-brand-300 transition`}>
        <span>{countryFlag(country)}</span>
        <span>{compact ? country.toUpperCase() : countryLabel(country)}</span>
        <ChevronDown size={compact ? 10 : 12} />
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-2xl shadow-2xl text-ink-900 dark:text-ink-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100 dark:border-ink-800">
              <div className="text-xs uppercase tracking-wider text-ink-500 font-semibold">Choose your country</div>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-ink-500 hover:bg-ink-50 dark:bg-ink-900/50 hover:text-ink-700 dark:text-ink-300">
                <X size={16} />
              </button>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {codes.map((c) => (
                <button key={c} onClick={() => { set(c); setOpen(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-sm rounded-xl hover:bg-ink-50 dark:bg-ink-900/50 ${country === c ? "bg-brand-50 text-brand-700 font-semibold" : ""}`}>
                  <span className="text-xl">{countryFlag(c)}</span>
                  <span>{countryLabel(c)}</span>
                  {country === c && <span className="ml-auto text-brand-600">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

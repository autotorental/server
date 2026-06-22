"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, MapPin, Calendar } from "lucide-react"
import { localizedPath, type Locale } from "../lib/locales"
import { t } from "../lib/i18n"

export default function SearchHero({ cities, brands, locale = "en" }: { cities: any[]; brands: any[]; locale?: Locale }) {
  const r = useRouter()
  const [period, setPeriod] = useState<"daily"|"weekly"|"monthly">("daily")
  const [city, setCity] = useState("")
  const [brand, setBrand] = useState("")
  const PERIODS = [
    { id: "daily", label: t(locale, "sh_daily") },
    { id: "weekly", label: t(locale, "sh_weekly") },
    { id: "monthly", label: t(locale, "sh_monthly") },
  ] as const
  const periodLabel = PERIODS.find(p => p.id === period)?.label || period
  const go = () => {
    const qs = new URLSearchParams()
    if (city) qs.set("city", city)
    if (brand) qs.set("brand", brand)
    if (period) qs.set("period", period)
    r.push(`${localizedPath("/cars", locale)}?${qs.toString()}`)
  }
  return (
    <div className="bg-white dark:bg-ink-900 rounded-xl shadow-2xl overflow-hidden max-w-4xl">
      <div className="flex gap-0 border-b border-ink-100 dark:border-ink-800 px-2 pt-1.5">
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-t-md transition ${period === p.id ? "text-brand-600 border-b-2 border-brand-600 -mb-px" : "text-ink-500 hover:text-ink-800 dark:text-ink-200"}`}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-1.5 p-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-ink-50 dark:bg-ink-900/50 rounded-lg">
          <MapPin size={15} className="text-brand-600 shrink-0"/>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-ink-500 font-medium">{t(locale, "sh_pickup_city")}</div>
            <select value={city} onChange={e => setCity(e.target.value)} className="w-full bg-transparent outline-none text-xs font-bold text-ink-900 dark:text-ink-100">
              <option value="">{t(locale, "sh_any_city")}</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}{c.country_code === "sy" ? " (SY)" : ""}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-ink-50 dark:bg-ink-900/50 rounded-lg">
          <Search size={15} className="text-brand-600 shrink-0"/>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-ink-500 font-medium">{t(locale, "sh_brand")}</div>
            <select value={brand} onChange={e => setBrand(e.target.value)} className="w-full bg-transparent outline-none text-xs font-bold text-ink-900 dark:text-ink-100">
              <option value="">{t(locale, "sh_any_brand")}</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-ink-50 dark:bg-ink-900/50 rounded-lg">
          <Calendar size={15} className="text-brand-600 shrink-0"/>
          <div className="flex-1">
            <div className="text-[10px] text-ink-500 font-medium">{t(locale, "sh_period")}</div>
            <div className="text-xs font-bold text-ink-900 dark:text-ink-100">{periodLabel}</div>
          </div>
        </div>
        <button onClick={go} className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-2 rounded-lg text-sm transition shadow-md flex items-center gap-1.5 justify-center">
          <Search size={14}/> {t(locale, "sh_search")}
        </button>
      </div>
    </div>
  )
}

"use client"
import { useLang, useCcy, SYMBOL } from "@/lib/prefs"
import { LOCALES, LOCALE_INFO, type Locale } from "@/lib/locales"
import { ChevronDown, Languages, DollarSign, X } from "lucide-react"
import { useState } from "react"

const LANGS: { id: Locale; label: string; flag: string }[] = LOCALES.map((id) => ({
  id,
  label: LOCALE_INFO[id].label,
  flag: LOCALE_INFO[id].flag,
}))
const CCYS: ("AED"|"SYP"|"USD"|"EUR"|"GBP")[] = ["AED","SYP","USD","EUR","GBP"]

export function LangSwitcher() {
  const [lang, set] = useLang()
  const [open, setOpen] = useState(false)
  const cur = LANGS.find(l => l.id === lang) || LANGS[0]
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} className="inline-flex items-center gap-1 text-[11px] font-medium hover:text-brand-300 transition">
        <Languages size={11}/>{cur.label}<ChevronDown size={10}/>
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-2xl shadow-2xl text-ink-900 dark:text-ink-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100 dark:border-ink-800">
              <div className="text-xs uppercase tracking-wider text-ink-500 font-semibold">Language</div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-ink-500 hover:bg-ink-50 dark:bg-ink-900/50 hover:text-ink-700 dark:text-ink-300"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-2">
              {LANGS.map(l => (
                <button key={l.id} onClick={() => { set(l.id); setOpen(false) }}
                  className={`w-full flex items-center gap-2.5 px-3 py-3 text-sm rounded-xl hover:bg-ink-50 dark:bg-ink-900/50 ${lang === l.id ? "bg-brand-50 text-brand-700 font-semibold" : ""}`}>
                  <span>{l.flag}</span><span>{l.label}</span>
                  {lang === l.id && <span className="ml-auto text-brand-600">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function CcySwitcher() {
  const [ccy, set] = useCcy()
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} className="inline-flex items-center gap-1 text-[11px] font-medium hover:text-brand-300 transition">
        <DollarSign size={11}/>{ccy}<ChevronDown size={10}/>
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-2xl shadow-2xl text-ink-900 dark:text-ink-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100 dark:border-ink-800">
              <div className="text-xs uppercase tracking-wider text-ink-500 font-semibold">Currency</div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-ink-500 hover:bg-ink-50 dark:bg-ink-900/50 hover:text-ink-700 dark:text-ink-300"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-2">
              {CCYS.map(c => (
                <button key={c} onClick={() => { set(c); setOpen(false) }}
                  className={`w-full flex items-center justify-between px-3 py-3 text-sm rounded-xl hover:bg-ink-50 dark:bg-ink-900/50 ${ccy === c ? "bg-brand-50 text-brand-700 font-semibold" : ""}`}>
                  <span>{c}</span><span className="text-ink-500 text-xs">{SYMBOL[c]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

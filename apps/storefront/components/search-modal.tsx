"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Search, X, Loader2 } from "lucide-react"
import { trackEvent } from "./tracking"

type Hit = {
  id: string; title: string; brand_name?: string; model_name?: string; city_name?: string;
  daily_price?: number; sale_daily_price?: number; discount_label?: string;
  photos?: string[]; year?: number;
}

export default function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("")
  const [hits, setHits] = useState<Hit[]>([])
  const [loading, setLoading] = useState(false)
  const [tookMs, setTookMs] = useState(0)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) setTimeout(() => ref.current?.focus(), 50) }, [open])

  useEffect(() => {
    if (!open) return
    if (q.length < 2) { setHits([]); return }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`https://api.autotorental.com/store/search?q=${encodeURIComponent(q)}&limit=10`, { headers: { "x-publishable-api-key": "pk_b9c89660573c5c7d3f54d11eb3132be59d6d919d4bb40c98b14877a2048feea1" } })
        const d = await r.json()
        setHits(d.hits || [])
        setTookMs(d.took_ms || 0)
        trackEvent("search", { search_term: q, results: d.hits?.length || 0 })
      } finally { setLoading(false) }
    }, 250)
    return () => clearTimeout(t)
  }, [q, open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4" onClick={onClose}>
      <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-ink-100 dark:border-ink-800">
          <Search className="text-ink-400" size={20}/>
          <input ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder="Search cars by brand, model, city…" className="flex-1 outline-none text-lg text-ink-900 dark:text-ink-100 placeholder-ink-400"/>
          {loading && <Loader2 className="text-brand-600 animate-spin" size={16}/>}
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 dark:text-ink-300"><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {q.length < 2 ? (
            <div className="p-8 text-center text-sm text-ink-400">
              Start typing to search cars · powered by Meilisearch
            </div>
          ) : hits.length === 0 && !loading ? (
            <div className="p-8 text-center text-sm text-ink-400">No results for <strong>"{q}"</strong></div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {hits.map(h => (
                <li key={h.id}>
                  <Link href={`/cars/${h.id}`} onClick={onClose} className="flex items-center gap-4 px-5 py-3 hover:bg-ink-50 dark:bg-ink-900/50">
                    <div className="w-16 h-12 rounded-md bg-ink-100 dark:bg-ink-800 overflow-hidden shrink-0">
                      {h.photos?.[0] && <img src={h.photos[0]} alt="" className="w-full h-full object-cover"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ink-900 dark:text-ink-100 truncate">{h.title}</div>
                      <div className="text-xs text-ink-500 truncate">
                        {h.brand_name && <span>{h.brand_name}</span>}
                        {h.year && <span> · {h.year}</span>}
                        {h.city_name && <span> · {h.city_name}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-brand-600">AED {(h.sale_daily_price || h.daily_price || 0).toLocaleString()}</div>
                      <div className="text-[10px] text-ink-500">/ day</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        {hits.length > 0 && (
          <div className="px-5 py-2 text-[11px] text-ink-400 border-t border-ink-100 dark:border-ink-800 flex justify-between">
            <span>{hits.length} results · {tookMs}ms</span>
            <span>Press <kbd className="px-1.5 py-0.5 bg-ink-100 dark:bg-ink-800 rounded">Esc</kbd> to close</span>
          </div>
        )}
      </div>
    </div>
  )
}

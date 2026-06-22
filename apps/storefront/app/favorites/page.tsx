"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Heart, Trash2 } from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.autotorental.com"
const KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

export default function FavoritesPage() {
  const [ids, setIds] = useState<string[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fav = JSON.parse(localStorage.getItem("favorites") || "[]") as string[]
    setIds(fav)
    if (fav.length === 0) { setLoading(false); return }
    Promise.all(fav.map(id => fetch(`${API}/store/vehicles/${id}`, { headers: { "x-publishable-api-key": KEY } }).then(r => r.ok ? r.json() : null).catch(() => null)))
      .then(results => setVehicles(results.filter(Boolean).map(r => r.vehicle)))
      .finally(() => setLoading(false))
  }, [])

  const remove = (id: string) => {
    const next = ids.filter(x => x !== id)
    localStorage.setItem("favorites", JSON.stringify(next))
    setIds(next)
    setVehicles(vehicles.filter(v => v.id !== id))
  }
  const clear = () => {
    if (!confirm("Remove all favorites?")) return
    localStorage.setItem("favorites", "[]")
    setIds([]); setVehicles([])
  }

  return (
    <>
      <section className="bg-ink-50 dark:bg-ink-900/50 border-b border-ink-100 dark:border-ink-800 py-7">
        <div className="mx-auto max-w-7xl px-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs text-ink-500 mb-2"><Link href="/" className="hover:text-brand-600">Home</Link> › Favorites</div>
            <h1 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100 inline-flex items-center gap-2"><Heart size={26} className="text-red-500" fill="currentColor"/> Your Favorites</h1>
            <p className="text-sm text-ink-500 mt-1">{vehicles.length} saved car{vehicles.length === 1 ? "" : "s"}</p>
          </div>
          {vehicles.length > 0 && <button onClick={clear} className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium"><Trash2 size={14}/>Clear all</button>}
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4">
          {loading ? (
            <div className="text-center py-20 text-ink-400">Loading…</div>
          ) : vehicles.length === 0 ? (
            <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-2xl p-16 text-center">
              <div className="text-6xl mb-4">💖</div>
              <h2 className="text-xl font-bold text-ink-900 dark:text-ink-100 mb-2">No favorites yet</h2>
              <p className="text-ink-500 mb-6">Tap the ♡ on any car to save it here for later.</p>
              <Link href="/cars" className="btn-primary inline-flex">Browse cars</Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {vehicles.map(v => (
                <div key={v.id} className="group bg-white dark:bg-ink-900 rounded-xl overflow-hidden border border-ink-100 dark:border-ink-800 shadow-card relative">
                  <button onClick={() => remove(v.id)} className="absolute top-3 right-3 z-10 w-8 h-8 bg-white dark:bg-ink-900/95 hover:bg-red-500 hover:text-white rounded-lg flex items-center justify-center text-red-500 transition shadow"><Heart size={15} fill="currentColor"/></button>
                  <Link href={`/cars/${v.id}`} className="block">
                    <div className="aspect-[4/3] bg-ink-100 dark:bg-ink-800 overflow-hidden">
                      {v.photos?.[0] && <img src={v.photos[0]} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-ink-900 dark:text-ink-100 line-clamp-1 group-hover:text-brand-600">{v.title}</h3>
                      <div className="text-xs text-ink-500 mt-1 capitalize">{v.year} · {v.transmission} · {v.seats} seats</div>
                      <div className="mt-3 pt-3 border-t border-ink-100 dark:border-ink-800 flex items-baseline justify-between">
                        <span className="text-lg font-bold text-ink-900 dark:text-ink-100">{v.currency_code?.toUpperCase()} {(v.sale_daily_price || v.daily_price)?.toLocaleString()}</span>
                        <span className="text-xs text-ink-500">/ day</span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

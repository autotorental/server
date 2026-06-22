"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Heart, Bell, Clock, Building2, MessageCircle, User, ArrowRight, ExternalLink, ShieldCheck } from "lucide-react"
import { SUPPORT_PHONE_WA_URL } from "@/lib/site-contact"
import AccountAuth from "@/components/account-auth"

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.autotorental.com"
const KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

export default function AccountPage() {
  const [favIds, setFavIds] = useState<string[]>([])
  const [followIds, setFollowIds] = useState<string[]>([])
  const [recentIds, setRecentIds] = useState<string[]>([])
  const [favVehicles, setFavVehicles] = useState<any[]>([])
  const [recentVehicles, setRecentVehicles] = useState<any[]>([])
  const [followCompanies, setFollowCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Read everything from localStorage
    const favs = JSON.parse(localStorage.getItem("favorites") || "[]")
    const recents = JSON.parse(localStorage.getItem("recent_views") || "[]")
    const follows: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith("follow:") && localStorage.getItem(k) === "1") {
        follows.push(k.replace("follow:", ""))
      }
    }
    setFavIds(favs); setRecentIds(recents); setFollowIds(follows)

    const headers = { "x-publishable-api-key": KEY }
    Promise.all([
      Promise.all(favs.map((id: string) => fetch(`${API}/store/vehicles/${id}`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null))),
      Promise.all(recents.slice(0, 6).map((id: string) => fetch(`${API}/store/vehicles/${id}`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null))),
      Promise.all(follows.map((id: string) => fetch(`${API}/store/sellers/${id}`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null))),
    ]).then(([fv, rv, fc]) => {
      setFavVehicles(fv.filter(Boolean).map((r: any) => r.vehicle))
      setRecentVehicles(rv.filter(Boolean).map((r: any) => r.vehicle).filter((v: any) => !favs.includes(v.id)))
      setFollowCompanies(fc.filter(Boolean).map((r: any) => r.seller))
    }).finally(() => setLoading(false))
  }, [])

  const hasAny = favVehicles.length > 0 || followCompanies.length > 0 || recentVehicles.length > 0

  return (
    <>
      <section className="bg-gradient-to-br from-brand-600 to-brand-900 text-white py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-xs text-brand-200 mb-3"><Link href="/" className="hover:text-white">Home</Link> › Your Activity</div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white backdrop-blur flex items-center justify-center overflow-hidden p-2 shadow-lg"><img src="/icon-512.png" alt="Auto to Rental" className="w-full h-full object-contain"/></div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black">Your Activity</h1>
              <p className="text-brand-100 mt-1">Sign in to save your favorites, follows & profile — or keep browsing as a guest.</p>
            </div>
          </div>
        </div>
      </section>

      <AccountAuth/>

      {/* Stats */}
      <section className="py-8 border-b border-ink-100 dark:border-ink-800">
        <div className="mx-auto max-w-7xl px-4 grid grid-cols-3 gap-4 text-center">
          <div className="bg-white dark:bg-ink-900 rounded-2xl p-5 border border-ink-100 dark:border-ink-800">
            <Heart size={20} className="text-red-500 mx-auto mb-2" fill="currentColor"/>
            <div className="text-2xl font-black text-ink-900 dark:text-ink-100">{favIds.length}</div>
            <div className="text-xs text-ink-500">Favorite cars</div>
          </div>
          <div className="bg-white dark:bg-ink-900 rounded-2xl p-5 border border-ink-100 dark:border-ink-800">
            <Bell size={20} className="text-brand-600 mx-auto mb-2"/>
            <div className="text-2xl font-black text-ink-900 dark:text-ink-100">{followIds.length}</div>
            <div className="text-xs text-ink-500">Companies followed</div>
          </div>
          <div className="bg-white dark:bg-ink-900 rounded-2xl p-5 border border-ink-100 dark:border-ink-800">
            <Clock size={20} className="text-ink-600 dark:text-ink-400 mx-auto mb-2"/>
            <div className="text-2xl font-black text-ink-900 dark:text-ink-100">{recentIds.length}</div>
            <div className="text-xs text-ink-500">Recently viewed</div>
          </div>
        </div>
      </section>

      {/* Empty state */}
      {!loading && !hasAny && (
        <section className="py-16">
          <div className="mx-auto max-w-3xl px-4 text-center bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-2xl p-12">
            <div className="text-6xl mb-4">🚗</div>
            <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100 mb-2">Nothing here yet</h2>
            <p className="text-ink-500 mb-6">Browse cars and click the ❤️ to save favorites or follow rental companies. Everything you save will appear here.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/cars" className="btn-primary">Browse cars</Link>
              <Link href="/companies" className="btn-outline">Browse rental companies</Link>
            </div>
          </div>
        </section>
      )}

      {/* Favorites */}
      {favVehicles.length > 0 && (
        <section className="py-10">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-ink-900 dark:text-ink-100 inline-flex items-center gap-2"><Heart size={22} className="text-red-500" fill="currentColor"/> Your Favorite Cars</h2>
                <p className="text-sm text-ink-500 mt-1">{favVehicles.length} saved</p>
              </div>
              <Link href="/favorites" className="text-sm font-bold text-brand-600 hover:text-brand-700">Manage →</Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {favVehicles.slice(0, 8).map((v: any) => (
                <Link key={v.id} href={`/cars/${v.id}`} className="group bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 hover:border-brand-300 hover:shadow-cardHover rounded-xl overflow-hidden">
                  <div className="aspect-[4/3] bg-ink-100 dark:bg-ink-800 overflow-hidden">{v.photos?.[0] && <img src={v.photos[0]} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition"/>}</div>
                  <div className="p-4">
                    <h3 className="font-bold text-ink-900 dark:text-ink-100 line-clamp-1 group-hover:text-brand-600">{v.title}</h3>
                    <div className="mt-2 text-sm text-ink-500">{(v.currency_code || "AED").toUpperCase()} {(v.sale_daily_price || v.daily_price)?.toLocaleString()} <span className="text-xs">/day</span></div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Followed companies */}
      {followCompanies.length > 0 && (
        <section className="py-10 bg-ink-50 dark:bg-ink-900/50">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="text-2xl font-black text-ink-900 dark:text-ink-100 inline-flex items-center gap-2 mb-6"><Bell size={22} className="text-brand-600"/> Companies You Follow</h2>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {followCompanies.map((s: any) => (
                <Link key={s.id} href={`/companies/${s.id}`} className="group bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 hover:border-brand-300 hover:shadow-cardHover rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-ink-100 dark:bg-ink-800 overflow-hidden flex items-center justify-center shrink-0">{s.logo ? <img src={s.logo} alt={s.name} className="w-full h-full object-cover"/> : <Building2 size={22} className="text-ink-400"/>}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-ink-900 dark:text-ink-100 truncate group-hover:text-brand-600">{s.name}</div>
                    <div className="text-xs text-ink-500 truncate">{s.handle || "Verified rental company"}</div>
                  </div>
                  <ArrowRight size={18} className="text-ink-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition"/>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recently viewed */}
      {recentVehicles.length > 0 && (
        <section className="py-10">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="text-2xl font-black text-ink-900 dark:text-ink-100 inline-flex items-center gap-2 mb-6"><Clock size={22} className="text-ink-600 dark:text-ink-400"/> Recently Viewed</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {recentVehicles.slice(0, 8).map((v: any) => (
                <Link key={v.id} href={`/cars/${v.id}`} className="group bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 hover:border-brand-300 hover:shadow-cardHover rounded-xl overflow-hidden">
                  <div className="aspect-[4/3] bg-ink-100 dark:bg-ink-800 overflow-hidden">{v.photos?.[0] && <img src={v.photos[0]} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition"/>}</div>
                  <div className="p-4">
                    <h3 className="font-bold text-ink-900 dark:text-ink-100 line-clamp-1 group-hover:text-brand-600">{v.title}</h3>
                    <div className="mt-2 text-sm text-ink-500">{(v.currency_code || "AED").toUpperCase()} {(v.sale_daily_price || v.daily_price)?.toLocaleString()} <span className="text-xs">/day</span></div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* For rental companies */}
      <section className="py-14 bg-gradient-to-br from-ink-900 to-ink-950 text-white">
        <div className="mx-auto max-w-5xl px-4 grid md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-ink-900/5 rounded-2xl p-6 border border-white/10">
            <Building2 size={24} className="text-brand-400 mb-3"/>
            <h3 className="font-bold text-lg mb-2">Are you a rental company?</h3>
            <p className="text-sm text-ink-300 leading-relaxed mb-4">Log in to your vendor dashboard to manage listings, see analytics, and receive customer enquiries.</p>
            <a href="https://partner.autotorental.com/rental/login" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition">
              Vendor Login <ExternalLink size={14}/>
            </a>
          </div>
          <div className="bg-white dark:bg-ink-900/5 rounded-2xl p-6 border border-white/10">
            <ShieldCheck size={24} className="text-emerald-400 mb-3"/>
            <h3 className="font-bold text-lg mb-2">Platform admin?</h3>
            <p className="text-sm text-ink-300 leading-relaxed mb-4">Sign in to the admin dashboard to manage all companies, vehicles, bookings and approvals.</p>
            <a href="https://admin.autotorental.com" className="inline-flex items-center gap-2 bg-ink-700 hover:bg-ink-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition">
              Admin Dashboard <ExternalLink size={14}/>
            </a>
          </div>
          <div className="bg-white dark:bg-ink-900/5 rounded-2xl p-6 border border-white/10">
            <MessageCircle size={24} className="text-amber-300 mb-3"/>
            <h3 className="font-bold text-lg mb-2">Need help?</h3>
            <p className="text-sm text-ink-300 leading-relaxed mb-4">Browse our FAQ or contact us via WhatsApp — usually reply within a few hours.</p>
            <div className="flex gap-2 flex-wrap">
              <Link href="/help" className="inline-flex items-center gap-2 border border-white/30 hover:border-white text-white font-semibold px-4 py-2 rounded-xl text-sm">Help Center</Link>
              <a href={SUPPORT_PHONE_WA_URL} target="_blank" rel="noopener" className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2 rounded-xl text-sm">WhatsApp</a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

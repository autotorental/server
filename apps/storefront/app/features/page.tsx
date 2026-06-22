import Link from "next/link"
import {
  Car, Video, Tag, Bell, MessageCircle, PhoneCall, Globe, ShieldCheck, MapPin,
  Star, Radio, BadgePercent, Plus, BarChart3, Megaphone, Newspaper, DownloadCloud,
  Mail, Crown, Users, ArrowRight, Sparkles, Check,
} from "lucide-react"
import { getLocale } from "@/lib/locale-server"
import { localizedPath } from "@/lib/locales"
import { translateBatch } from "@/lib/mt"
import { seoFor } from "@/lib/seo-helper"

export const revalidate = 300

export async function generateMetadata() {
  const locale = await getLocale()
  const [title, description] = await translateBatch(
    [
      "Platform Features — Everything Auto to Rental Can Do",
      "Discover everything Auto to Rental offers: browse verified cars, watch car videos, follow companies, chat and call directly — plus a full toolkit for rental companies to list, advertise and grow.",
    ],
    locale,
  )
  return seoFor("/features", { title, description })
}

// ---- Content (written once in English, auto-translated per visitor locale) ----
const CHROME = {
  heroEyebrow: "The complete platform",
  heroTitle1: "Everything you need to rent.",
  heroTitle2: "Everything you need to grow.",
  heroSub:
    "Auto to Rental is far more than a listings site. It is a complete toolkit — for renters to find the perfect car in seconds, and for rental companies to run, promote and scale their business. All in one place.",
  heroBrowse: "Browse cars",
  heroList: "List your fleet",
  renterEyebrow: "For renters",
  renterHeading: "Find your perfect car, faster",
  renterSub: "Powerful tools that make renting effortless — and put you in direct contact with trusted companies.",
  vendorEyebrow: "For rental companies",
  vendorHeading: "Run and grow your rental business",
  vendorSub: "A professional toolkit usually reserved for big platforms — built in, and free to start.",
  trustHeading: "Built on trust",
  ctaHeading: "Ready to get started?",
  ctaSub: "Find your next car, or put your fleet in front of thousands of customers today.",
  ctaBrowse: "Browse cars",
  ctaList: "List your fleet free",
  statCompanies: "Rental companies",
  statVisitors: "Monthly visitors",
  statCommission: "Commission",
  statCountries: "Countries served",
}

const RENTER = [
  { icon: Car, t: "Browse verified cars", s: "Explore thousands of rental cars from verified companies — filtered by country, city, brand and budget." },
  { icon: Video, t: "Watch car videos & reels", s: "See every car in action with short videos before you decide — like reels, built for cars." },
  { icon: Tag, t: "Explore by brand", s: "Mercedes, BMW, Toyota and 100+ brands, each with its own dedicated showroom page." },
  { icon: Bell, t: "Follow companies", s: "Follow the companies you trust and get notified the moment they add new cars or offers." },
  { icon: MessageCircle, t: "Chat directly", s: "Message any company instantly about price, availability and delivery — no middleman." },
  { icon: PhoneCall, t: "Free voice & video calls", s: "Call companies free inside the app — and even see the car live over video before you rent." },
  { icon: Globe, t: "7 languages & 13 currencies", s: "The whole platform speaks your language and shows prices in your currency, automatically." },
  { icon: ShieldCheck, t: "Verified trust badges", s: "Green checkmarks show you exactly which companies are verified — rent with confidence." },
  { icon: MapPin, t: "Nearby & maps", s: "See cars and companies near you on the map, with one-tap directions." },
  { icon: Star, t: "Save favorites", s: "Bookmark the cars you love and compare them side by side whenever you like." },
  { icon: Radio, t: "See who's online now", s: "A live indicator shows which companies are active right now for an instant reply." },
  { icon: BadgePercent, t: "No booking fees", s: "The price you see is the price you pay — we never add commission or hidden fees." },
]

const VENDOR = [
  { icon: Plus, t: "List your fleet in minutes", s: "Add cars with photos, VIN auto-decode, brand→model pickers and daily / weekly / monthly pricing." },
  { icon: BarChart3, t: "Real-time traffic analytics", s: "See who is viewing your cars, where they come from and what converts — live, in your dashboard." },
  { icon: Megaphone, t: "Paid ads from one wallet", s: "Promote your cars on Instagram, Facebook, TikTok, Snapchat and Google from a single prepaid AED wallet." },
  { icon: Globe, t: "Your own custom domain", s: "Run your storefront on your own domain — yourcompany.com — with automatic SSL included." },
  { icon: Newspaper, t: "News & announcements", s: "Publish offers and news that appear on your profile and reach all of your followers." },
  { icon: DownloadCloud, t: "Import cars from your website", s: "Already have a website? Import your entire fleet automatically — no re-typing." },
  { icon: Bell, t: "Push to your followers", s: "One tap sends a notification to everyone who follows you about a new car or a fresh deal." },
  { icon: Mail, t: "Professional company email", s: "Get a built-in name@yourcompany.com mailbox to look professional from day one." },
  { icon: Crown, t: "Verified, VIP & featured", s: "Stand out with verification, VIP status and featured placement at the top of search." },
  { icon: Users, t: "Team roles & permissions", s: "Add supervisors with granular, country-scoped permissions that you control." },
  { icon: MessageCircle, t: "Own the customer relationship", s: "Customers reach you by chat, call or WhatsApp — directly. You own every lead." },
  { icon: BadgePercent, t: "Zero commission", s: "Keep 100% of every booking. We never take a cut of your business." },
]

const TRUST = [
  { icon: ShieldCheck, t: "Verified companies only", s: "Every company is reviewed and verified before going live." },
  { icon: BadgePercent, t: "No commission, ever", s: "Direct prices with zero booking fees for renters and companies." },
  { icon: Globe, t: "Multi-country, multi-language", s: "Serving the UAE and Syria in 7 languages and 13 currencies." },
]

async function trCards<T extends { t: string; s: string }>(cards: T[], locale: any): Promise<T[]> {
  const flat = cards.flatMap((c) => [c.t, c.s])
  const tr = await translateBatch(flat, locale)
  return cards.map((c, i) => ({ ...c, t: tr[i * 2] || c.t, s: tr[i * 2 + 1] || c.s }))
}

export default async function FeaturesPage() {
  const locale = await getLocale()
  const lp = (p: string) => localizedPath(p, locale)

  const keys = Object.keys(CHROME) as (keyof typeof CHROME)[]
  const [chromeVals, renter, vendor, trust] = await Promise.all([
    translateBatch(keys.map((k) => CHROME[k]), locale),
    trCards(RENTER, locale),
    trCards(VENDOR, locale),
    trCards(TRUST, locale),
  ])
  const c = {} as Record<keyof typeof CHROME, string>
  keys.forEach((k, i) => (c[k] = chromeVals[i] || CHROME[k]))

  const stats = [
    { v: "500+", l: c.statCompanies },
    { v: "100K+", l: c.statVisitors },
    { v: "0%", l: c.statCommission },
    { v: "2", l: c.statCountries },
  ]

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-700 via-brand-800 to-ink-900 text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=2400" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-500/30 rounded-full blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/15 text-brand-100 font-semibold text-xs uppercase tracking-wider px-3 py-1.5 rounded-full mb-6">
            <Sparkles size={14} /> {c.heroEyebrow}
          </div>
          <h1 className="text-4xl md:text-6xl font-black leading-[1.05] tracking-tight max-w-4xl">
            {c.heroTitle1}
            <br />
            <span className="text-amber-300">{c.heroTitle2}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-200 leading-relaxed">{c.heroSub}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={lp("/cars")} className="bg-white text-brand-700 hover:bg-amber-300 hover:text-ink-900 font-bold px-7 py-4 rounded-xl transition inline-flex items-center gap-2">
              {c.heroBrowse} <ArrowRight size={18} />
            </Link>
            <Link href={lp("/list-your-car")} className="border border-white/30 hover:border-white text-white font-semibold px-7 py-4 rounded-xl transition">
              {c.heroList}
            </Link>
          </div>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
            {stats.map((s) => (
              <div key={s.l} className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/15">
                <div className="text-3xl md:text-4xl font-black text-brand-300">{s.v}</div>
                <div className="text-xs md:text-sm text-ink-200 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For renters */}
      <section className="page-section">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <div className="text-brand-600 font-bold text-sm uppercase tracking-wider mb-2">{c.renterEyebrow}</div>
            <h2 className="text-3xl md:text-4xl font-black text-ink-900 dark:text-ink-100">{c.renterHeading}</h2>
            <p className="mt-3 text-ink-600 dark:text-ink-400 leading-relaxed">{c.renterSub}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {renter.map((x, i) => {
              const I = x.icon
              return (
                <div key={i} className="surface-card interactive-card p-6">
                  <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
                    <I size={22} />
                  </div>
                  <h3 className="font-bold text-lg text-ink-900 dark:text-ink-100 mb-2">{x.t}</h3>
                  <p className="text-sm text-ink-600 dark:text-ink-400 leading-relaxed">{x.s}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* For rental companies */}
      <section className="page-section section-muted">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <div className="text-brand-600 font-bold text-sm uppercase tracking-wider mb-2">{c.vendorEyebrow}</div>
            <h2 className="text-3xl md:text-4xl font-black text-ink-900 dark:text-ink-100">{c.vendorHeading}</h2>
            <p className="mt-3 text-ink-600 dark:text-ink-400 leading-relaxed">{c.vendorSub}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {vendor.map((x, i) => {
              const I = x.icon
              return (
                <div key={i} className="surface-card p-6 relative overflow-hidden group">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-center justify-center mb-4 shadow-lg">
                    <I size={22} />
                  </div>
                  <h3 className="font-bold text-lg text-ink-900 dark:text-ink-100 mb-2">{x.t}</h3>
                  <p className="text-sm text-ink-600 dark:text-ink-400 leading-relaxed">{x.s}</p>
                </div>
              )
            })}
          </div>
          <div className="mt-10 text-center">
            <Link href={lp("/list-your-car")} className="btn-primary inline-flex text-base">
              {c.heroList} <ArrowRight size={18} className="ml-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="page-section">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-ink-900 dark:text-ink-100">{c.trustHeading}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {trust.map((x, i) => {
              const I = x.icon
              return (
                <div key={i} className="flex gap-4 items-start surface-card p-6">
                  <div className="w-11 h-11 shrink-0 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                    <I size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-ink-900 dark:text-ink-100 mb-1 flex items-center gap-1.5">
                      {x.t} <Check size={15} className="text-green-500" />
                    </h3>
                    <p className="text-sm text-ink-600 dark:text-ink-400 leading-relaxed">{x.s}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-brand-600 to-brand-900 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">{c.ctaHeading}</h2>
          <p className="text-lg text-brand-100 mb-7">{c.ctaSub}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href={lp("/cars")} className="bg-white text-brand-700 hover:bg-amber-300 hover:text-ink-900 font-bold px-7 py-3.5 rounded-xl transition">
              {c.ctaBrowse}
            </Link>
            <Link href={lp("/list-your-car")} className="border border-white/30 hover:border-white text-white font-semibold px-7 py-3.5 rounded-xl transition">
              {c.ctaList}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

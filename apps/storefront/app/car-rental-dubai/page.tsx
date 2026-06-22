import Link from "next/link"
import { api } from "@/lib/api"
import VehicleCard from "@/components/vehicle-card"
import { buildMetadata } from "@/lib/seo"
import { seoFor } from "@/lib/seo-helper"
import { BreadcrumbJsonLd, FAQPageJsonLd, ItemListJsonLd } from "@/components/jsonld"
import { Star, ShieldCheck, BadgePercent, MessageCircle, MapPin, CheckCircle2 } from "lucide-react"
import { getLocale } from "@/lib/locale-server"
import { localizedPath } from "@/lib/locales"
import { carRentalDubaiContent } from "@/lib/dubai-i18n"
import { translateBatch } from "@/lib/mt"

export const revalidate = 300

export async function generateMetadata() {
  const locale = await getLocale()
  const m = carRentalDubaiContent(locale)
  return seoFor("/car-rental-dubai", {
    title: m.metaTitle,
    description: m.metaDesc,
    path: "/car-rental-dubai",
    locale,
    keywords: [
      "car rental Dubai", "rent a car Dubai", "rent car Dubai", "car hire Dubai", "cheap car rental Dubai",
      "monthly car rental Dubai", "luxury car rental Dubai", "sports car rental Dubai", "SUV rental Dubai",
      "car rental Dubai airport", "car rental Dubai marina", "Dubai car hire", "rental cars Dubai",
    ],
  })
}

export default async function CarRentalDubaiPage() {
  const [b, c, vAll, locale] = await Promise.all([
    api.brands().catch(() => ({ brands: [] })),
    api.cities().catch(() => ({ cities: [] })),
    api.vehicles({ limit: 60 }).catch(() => ({ vehicles: [] })),
    getLocale(),
  ])
  const lp = (p: string) => localizedPath(p, locale)
  const m = carRentalDubaiContent(locale)
  const FAQ = m.faqs
  const TRUST_ICONS = [ShieldCheck, BadgePercent, MessageCircle, Star]
  const dubai = c.cities.find((x: any) => x.name === "Dubai" || x.slug === "dubai")
  const vehicles = dubai
    ? (await api.vehicles({ city_id: dubai.id, limit: 12 }).catch(() => ({ vehicles: [] }))).vehicles
    : vAll.vehicles.slice(0, 12)
  const brandMap = new Map(b.brands.map((x: any) => [x.id, x.name]))
  const cityMap = new Map(c.cities.map((x: any) => [x.id, x.name]))
  const topBrands = b.brands.slice(0, 12)
  const shown = vehicles.slice(0, 8)
  const __titles = await translateBatch(shown.map((x: any) => x.title), locale)
  const __titleById = new Map(shown.map((x: any, i: number) => [x.id, __titles[i]]))

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: m.home, url: lp("/") }, { name: m.bc, url: lp("/car-rental-dubai") }]}/>
      <FAQPageJsonLd faqs={FAQ}/>
      <ItemListJsonLd name="Top Rental Cars in Dubai" items={vehicles.map((v: any) => ({ id: v.id, slug: v.slug, title: v.title, price: v.daily_price, photo: v.photos?.[0] }))}/>

      {/* HERO */}
      <section className="relative bg-gradient-to-br from-brand-700 via-brand-800 to-ink-900 text-white py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-25">
          <img src="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=2400" alt="" className="w-full h-full object-cover"/>
        </div>
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="text-xs text-brand-200 mb-3 flex gap-2 items-center">
            <Link href={lp("/")} className="hover:text-white">{m.home}</Link><span>›</span><span>{m.bc}</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-amber-400 text-ink-950 font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wider mb-5">{m.badge}</div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.05]">
            {m.h1a}<br/>
            <span className="text-amber-300">{m.h1b}</span>
          </h1>
          <p className="mt-5 text-lg text-ink-200 max-w-2xl">
            {m.heroSub.replace("{n}", String(vehicles.length))}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={dubai ? lp(`/cars?city=${dubai.id}`) : lp("/cars")} className="bg-white dark:bg-ink-900 text-brand-700 hover:bg-amber-300 hover:text-ink-950 font-bold px-7 py-3.5 rounded-xl transition">{m.ctaBrowse}</Link>
            <Link href={lp("/list-your-car")} className="border border-white/30 hover:border-white text-white font-semibold px-7 py-3.5 rounded-xl">{m.ctaList}</Link>
          </div>
          <div className="mt-7 flex flex-wrap gap-5 text-sm text-ink-200">
            {m.heroBadges.map((badge, i) => (
              <span key={i} className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-green-400"/>{badge}</span>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="border-b border-ink-100 dark:border-ink-800 py-7 bg-white dark:bg-ink-900">
        <div className="mx-auto max-w-7xl px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
          {m.trust.map((x, i) => {
            const Icon = TRUST_ICONS[i]
            return (
            <div key={i} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0"><Icon size={20}/></div>
              <div>
                <div className="font-semibold text-ink-900 dark:text-ink-100 text-sm">{x.t}</div>
                <div className="text-xs text-ink-500 mt-0.5">{x.s}</div>
              </div>
            </div>
          )})}
        </div>
      </section>

      {/* FEATURED CARS in Dubai */}
      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-end justify-between mb-7">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100">{m.featuredTitle}</h2>
              <p className="text-sm text-ink-500 mt-1">{m.featuredSub}</p>
            </div>
            <Link href={dubai ? lp(`/cars?city=${dubai.id}`) : lp("/cars")} className="text-sm font-bold text-brand-600 hover:text-brand-700">{m.viewAll}</Link>
          </div>
          {vehicles.length === 0 ? (
            <div className="bg-ink-50 dark:bg-ink-900/50 rounded-2xl p-12 text-center text-ink-500">{m.carsLoading}</div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shown.map((v: any) => (
                <VehicleCard key={v.id} v={v} brand={brandMap.get(v.brand_id)} city={cityMap.get(v.city_id)} locale={locale} displayTitle={__titleById.get(v.id)}/>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* BY BRAND */}
      <section className="py-14 bg-ink-50 dark:bg-ink-900/50">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100 mb-2">{m.byBrandTitle}</h2>
          <p className="text-sm text-ink-500 mb-7">{m.byBrandSub}</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {topBrands.map((br: any) => (
              <Link key={br.id} href={lp(`/cars?brand=${br.id}&city=${dubai?.id || ""}`)} className="bg-white dark:bg-ink-900 rounded-xl border border-ink-100 dark:border-ink-800 hover:border-brand-300 hover:shadow-cardHover p-4 flex flex-col items-center text-center">
                <div className="h-12 flex items-center justify-center">{br.logo_url ? <img src={br.logo_url} alt={br.name} className="max-h-10 max-w-full object-contain"/> : <span className="font-bold text-ink-700 dark:text-ink-300">{br.name}</span>}</div>
                <div className="mt-2 text-xs font-semibold text-ink-700 dark:text-ink-300">{br.name} {m.brandSuffix}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CONTENT-RICH SEO SECTION */}
      <section className="py-14">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100 mb-5">{m.seoTitle}</h2>
          <div className="prose-section space-y-5 text-ink-700 dark:text-ink-300 leading-relaxed">
            {m.intro.map((block, i) => (
              <div key={i} className="space-y-5">
                {block.h3 && <h3 className="text-xl font-bold text-ink-900 dark:text-ink-100 mt-7">{block.h3}</h3>}
                {block.p?.map((para, j) => <p key={j} dangerouslySetInnerHTML={{ __html: para }}/>)}
                {block.ul && <ul>{block.ul.map((li, k) => <li key={k} dangerouslySetInnerHTML={{ __html: li }}/>)}</ul>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 bg-ink-50 dark:bg-ink-900/50">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100 mb-8">{m.faqTitle}</h2>
          <div className="space-y-3">
            {FAQ.map((f, i) => (
              <details key={i} className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-xl p-5 group">
                <summary className="font-bold text-ink-900 dark:text-ink-100 cursor-pointer list-none flex items-center justify-between">
                  <span>{f.q}</span>
                  <span className="text-ink-400 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-ink-700 dark:text-ink-300 text-sm leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-gradient-to-br from-brand-600 to-brand-900 text-white text-center">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-3xl md:text-4xl font-black">{m.ctaTitle}</h2>
          <p className="mt-3 text-brand-100 text-lg">{m.ctaSub}</p>
          <Link href={dubai ? lp(`/cars?city=${dubai.id}`) : lp("/cars")} className="mt-7 inline-block bg-amber-300 hover:bg-amber-400 text-ink-950 font-bold px-8 py-4 rounded-xl transition">{m.ctaBtn}</Link>
        </div>
      </section>
    </>
  )
}

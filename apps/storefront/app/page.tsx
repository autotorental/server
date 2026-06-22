
export async function generateMetadata() {
  return seoFor("/", {
    title: "Auto to Rental — Car Rental Marketplace UAE & Syria",
    description: "Browse rental cars from verified companies across the UAE. Direct contact, no commission, no booking fees.",
  })
}
import Link from "next/link"
import { api } from "@/lib/api"
import { seoFor } from "@/lib/seo-helper"
import VehicleCard from "@/components/vehicle-card"
import NewsTicker from "@/components/news-ticker"
import ActivityTicker from "@/components/activity-ticker"
import HeroCarousel from "@/components/hero-carousel"
import CityCard from "@/components/city-card"
import MonthlyDealsCarousel from "@/components/monthly-deals-carousel"
import { FAQPageJsonLd } from "@/components/jsonld"
import { CheckCircle2, ShieldCheck, MessageCircle, BadgePercent, ArrowRight, Search, KeyRound } from "lucide-react"
import { getServerCountry, countryLabel } from "@/lib/country-server"
import HomeFaqSection from "@/components/home-faq-section"
import { STARTER_SEO_INTENT_PAGES, getSeoIntentPath, intentLabel } from "@/lib/seo-intent-pages"
import { getLocale } from "@/lib/locale-server"
import { localizedPath } from "@/lib/locales"
import { t } from "@/lib/i18n"
import { getHomeFaqs } from "@/lib/home-faqs"
import { translateBatch } from "@/lib/mt"
import CarTypeIcon from "@/components/CarTypeIcon"

export const revalidate = 30

const BODY_ICONS: Record<string, string> = {
  Sedan: "🚗", SUV: "🚙", Crossover: "🚙", Coupe: "🏎️", Convertible: "🚘", Hatchback: "🚕",
  Pickup: "🛻", Van: "🚐", "Sports Car": "🏎️", Luxury: "✨",
}

export default async function Home() {
  const country = await getServerCountry()
  const locale = await getLocale()
  const lp = (p: string) => localizedPath(p, locale)
  const HOME_FAQS = getHomeFaqs(locale)
  let [v, b, c, bt, s, btc] = await Promise.all([
    api.vehicles({ limit: 12, country }).catch(() => ({ vehicles: [] })),
    api.brands().catch(() => ({ brands: [] })),
    api.cities().catch(() => ({ cities: [] })),
    api.body_types().catch(() => ({ body_types: [] })),
    api.sellers().catch(() => ({ sellers: [] })),
    api.body_type_counts(country).catch(() => ({ counts: {} })),
  ])

  // SEO + UX FIX: if the visitor's detected country has no inventory yet
  // (e.g. Googlebot resolves to US where we have 0 cars), fall back to the
  // marketplace's primary market so search engines and visitors always see
  // real cars instead of an empty "No cars available" page.
  let featuredCountryName = country === "ae" ? "United Arab Emirates" : country.toUpperCase()
  if (!v.vehicles || v.vehicles.length === 0) {
    const fb = await api.vehicles({ limit: 12, country: "ae" }).catch(() => ({ vehicles: [] }))
    if (fb.vehicles && fb.vehicles.length > 0) {
      v = fb as any
      featuredCountryName = "United Arab Emirates"
    }
  }
  const carCountById = new Map<string, number>(Object.entries((btc as any)?.counts || {}).map(([k, n]) => [k, Number(n)]))
  const brandMap = new Map(b.brands.map((x: any) => [x.id, x.name]))
  const cityMap = new Map(c.cities.map((x: any) => [x.id, x.name]))
  const sellerMap = new Map(s.sellers.map((x: any) => [x.id, x.name]))
  const countryCities = c.cities.filter((x: any) => x.country_code === country)
  const countryName = country === "ae" ? t(locale, "country_ae") : country === "sy" ? t(locale, "country_sy") : countryLabel(country)
  const countryFlag = /^[a-z]{2}$/.test(country) ? String.fromCodePoint(...[...country.toUpperCase()].map((ch) => 127397 + ch.charCodeAt(0))) : "🌐"
  const topBrands = b.brands.slice(0, 12)
  const topCityLinks = countryCities.slice(0, 6)
  const popularBrandLinks = b.brands.slice(0, 6)
  const seoIntentLinks = STARTER_SEO_INTENT_PAGES.filter((page) => page.countryCode === country).slice(0, 8)
  const __titles = await translateBatch(v.vehicles.map((x: any) => x.title), locale)
  const __titleById = new Map(v.vehicles.map((x: any, i: number) => [x.id, __titles[i]]))

  return (
    <>
      <section className="relative">
        {/* Banner image (full-bleed) */}
        <div className="relative h-[520px] md:h-[620px] overflow-hidden">
          <HeroCarousel/>
          {/* legibility gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/40 md:bg-gradient-to-r md:from-black/75 md:via-black/40 md:to-transparent pointer-events-none"/>
          <div className="relative mx-auto max-w-7xl px-4 h-full flex items-center">
            <div className="text-white max-w-3xl text-center md:text-left mx-auto md:mx-0 w-full">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/12 backdrop-blur px-3.5 py-1.5 text-xs md:text-sm font-semibold border border-white/15 mb-4">
                <span className="text-base leading-none">{countryFlag}</span> {countryName} · 0% commission
              </span>
              <h1 className="text-4xl md:text-6xl font-black leading-[1.02] tracking-tight drop-shadow-sm">
                {t(locale, "home_h1_find")} <span className="text-[#5fa8ff]" style={{textShadow:"0 0 20px rgba(95,168,255,0.6), 0 0 40px rgba(95,168,255,0.3)"}}>{t(locale, "home_h1_rental_car")}</span><br/>{t(locale, "home_h1_in")} {countryName}.
              </h1>
              <p className="mt-4 text-lg md:text-xl text-white/90 max-w-xl mx-auto md:mx-0 leading-relaxed">
                {t(locale, "home_hero_sub")}
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Link href={lp("/cars")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-900/30 transition">
                  {t(locale, "view_all_cars")} <ArrowRight size={17}/>
                </Link>
                <Link href={lp("/list-your-car")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur border border-white/25 px-6 py-3.5 text-sm font-bold text-white transition">
                  {t(locale, "footer_list_car")}
                </Link>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* Live activity ticker — real events + admin news */}
      <ActivityTicker locale={locale} />

      {/* Global marketplace stats band */}
      <section className="relative z-10 text-white" style={{ background: "linear-gradient(90deg,#0a1428 0%,#0d1f44 50%,#0a1428 100%)" }}>
        <div className="mx-auto max-w-7xl px-4 py-7 md:py-9">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="text-center md:text-left">
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#7fb2ff]">{t(locale, "intl_marketplace_kicker")}</div>
              <div className="text-xl md:text-2xl font-black mt-1.5 leading-tight">{t(locale, "intl_marketplace_title")}</div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-5 gap-x-8 md:gap-x-12">
              {[
                { n: "7+", l: t(locale, "stat_languages") },
                { n: "13", l: t(locale, "stat_currencies") },
                { n: "0%", l: t(locale, "stat_commission") },
                { n: "24/7", l: t(locale, "stat_direct") },
              ].map((x, i) => (
                <div key={i} className="text-center md:text-left">
                  <div className="text-2xl md:text-3xl font-black tabular-nums">{x.n}</div>
                  <div className="text-[11px] text-white/55 mt-1 uppercase tracking-wider">{x.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 pt-8 md:pt-12 relative z-10">
        <div className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
          {[
            { I: ShieldCheck, t: t(locale, "trust_verified_t"), s: t(locale, "trust_verified_s") },
            { I: BadgePercent, t: t(locale, "trust_nocomm_t"), s: t(locale, "trust_nocomm_s") },
            { I: MessageCircle, t: t(locale, "trust_contact_t"), s: t(locale, "trust_contact_s") },
            { I: CheckCircle2, t: `${countryCities.length} ${t(locale, "trust_cities_t")}`, s: `${t(locale, "trust_cities_across")} ${countryName}` },
          ].map((x,i)=>(
            <div key={i} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0"><x.I size={20}/></div>
              <div>
                <div className="font-semibold text-ink-900 dark:text-ink-100 text-sm">{x.t}</div>
                <div className="text-xs text-ink-500 mt-0.5">{x.s}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ① Featured Cars — moved first */}
      <section className="page-section">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHead title={t(locale, "sec_featured_t")} sub={`${t(locale, "sec_featured_sub")} ${featuredCountryName}`} cta={{ label: t(locale, "view_all_cars"), href: lp("/cars") }}/>
          {v.vehicles.length === 0 ? (
            <div className="bg-ink-50 dark:bg-ink-900/50 rounded-2xl p-16 text-center">
              <div className="text-5xl mb-4">🚗</div>
              <h3 className="text-xl font-bold text-ink-900 dark:text-ink-100 mb-2">{t(locale, "no_cars_t")} {countryName} {t(locale, "no_cars_yet")}</h3>
              <p className="text-ink-500">{t(locale, "no_cars_s")}</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {v.vehicles.map((veh: any) => (
                <VehicleCard key={veh.id} v={veh} brand={brandMap.get(veh.brand_id)} city={cityMap.get(veh.city_id)} sellerName={sellerMap.get(veh.seller_id)} locale={locale} displayTitle={__titleById.get(veh.id)}/>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ② Browse by Brand */}
      <section className="page-section">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHead title={t(locale, "sec_brand_t")} sub={t(locale, "sec_brand_sub")} cta={{ label: t(locale, "sec_all_brands"), href: lp("/brands") }}/>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-3">
            {topBrands.map((br: any) => (
              <Link key={br.id} href={br.slug ? lp(`/cars/brand/${br.slug}`) : lp(`/cars?brand=${br.id}`)} className="group bg-white dark:bg-ink-900 rounded-xl border border-ink-100 dark:border-ink-800 hover:border-brand-300 hover:shadow-cardHover transition-all p-4 flex flex-col items-center justify-center text-center">
                <div className="h-12 w-full flex items-center justify-center">
                  {br.logo_url ? (
                    <img src={br.logo_url} alt={br.name} className="max-h-10 max-w-full object-contain"/>
                  ) : (
                    <span className="font-bold text-lg text-ink-700 dark:text-ink-300">{br.name}</span>
                  )}
                </div>
                <div className="mt-2 text-xs font-semibold text-ink-700 dark:text-ink-300 group-hover:text-brand-600">{br.name}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ③ Browse by Type */}
      <section className="page-section section-muted">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHead title={t(locale, "sec_type_t")} sub={t(locale, "sec_type_sub")}/>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {bt.body_types.slice(0, 18).map((b: any) => {
              const n = carCountById.get(b.id) || 0
              return (
              <Link key={b.id} href={lp(`/vehicle-category/${b.slug || b.id}`)} className="group relative bg-white dark:bg-ink-900 rounded-2xl border border-ink-100 dark:border-ink-800 hover:border-brand-400 hover:shadow-cardHover hover:-translate-y-0.5 transition-all overflow-hidden">
                <div className="relative h-32 w-full overflow-hidden bg-gradient-to-b from-ink-50 to-white dark:from-ink-800 dark:to-ink-900">
                  <CarTypeIcon name={b.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="px-3 py-3 text-center">
                  <div className="text-sm font-extrabold uppercase tracking-wide text-ink-900 dark:text-ink-100 group-hover:text-brand-600 transition-colors">{b.name}</div>
                  {n > 0
                    ? <div className="text-xs text-ink-500 mt-0.5">{n} {n === 1 ? "Car" : "Cars"}</div>
                    : <div className="text-xs font-semibold text-brand-600/80 mt-0.5">Browse →</div>}
                </div>
              </Link>
            )})}
          </div>
        </div>
      </section>

      <section className="py-10 md:py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-50 p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">{t(locale, "promo_slot")}</div>
              <h2 className="text-xl font-black text-ink-900 dark:text-ink-100 mt-1">{t(locale, "promo_t")} {countryName}</h2>
              <p className="text-sm text-ink-600 dark:text-ink-400 mt-1">{t(locale, "promo_sub")}</p>
            </div>
            <Link href={lp("/cars?period=monthly")} className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700 transition">
              {t(locale, "promo_cta")}
            </Link>
          </div>
        </div>
      </section>

      <section className="page-section bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white">
        <div className="mx-auto max-w-7xl px-4 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-block bg-white dark:bg-ink-900/15 backdrop-blur px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">{t(locale, "monthly_badge")}</div>
            <h2 className="text-3xl md:text-5xl font-black leading-tight">{t(locale, "monthly_save_a")} <span className="text-amber-300">40%</span> {t(locale, "monthly_save_b")}</h2>
            <p className="mt-4 text-brand-100 text-lg max-w-lg">{t(locale, "monthly_sub")}</p>
            <Link href={lp("/cars?period=monthly")} className="mt-6 inline-flex items-center gap-2 bg-white dark:bg-ink-900 text-brand-700 hover:bg-amber-300 hover:text-ink-900 dark:text-ink-100 font-bold px-7 py-3.5 rounded-xl transition">
              {t(locale, "monthly_cta")}
            </Link>
          </div>
          <div className="relative h-72 lg:h-96 rounded-2xl overflow-hidden shadow-2xl">
            <MonthlyDealsCarousel />
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHead title={`${t(locale, "sec_cities_t")} ${countryName} ${countryFlag}`} sub={t(locale, "find_near")}/>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {countryCities.map((ct: any) => (
              <CityCard key={ct.id} id={ct.id} slug={ct.slug} name={ct.name} nameAr={ct.name_ar} country={ct.country_code === "ae" ? "UAE" : "Syria"} imageUrl={ct.image_url}/>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section section-muted">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-12">
            <div className="inline-block text-brand-600 font-bold text-sm uppercase tracking-wider mb-3">{t(locale, "how_it_works")}</div>
            <h2 className="text-3xl md:text-4xl font-black text-ink-900 dark:text-ink-100">{t(locale, "three_steps")}</h2>
          </div>
          <div className="relative grid md:grid-cols-3 gap-6">
            {/* connector line (desktop) */}
            <div className="hidden md:block absolute top-9 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-brand-200 via-brand-400 to-brand-200 dark:from-ink-700 dark:via-brand-600 dark:to-ink-700" aria-hidden />
            {[
              { n: "1", I: Search, t: t(locale, "step1_t"), s: t(locale, "step1_s") },
              { n: "2", I: MessageCircle, t: t(locale, "step2_t"), s: t(locale, "step2_s") },
              { n: "3", I: KeyRound, t: t(locale, "step3_t"), s: t(locale, "step3_s") },
            ].map(s => (
              <div key={s.n} className="relative bg-white dark:bg-ink-900 rounded-2xl p-7 border border-ink-100 dark:border-ink-800 hover:border-brand-300 hover:shadow-cardHover hover:-translate-y-1 transition-all duration-300 text-center md:text-left">
                <div className="relative z-10 mx-auto md:mx-0 w-[72px] h-[72px] rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-brand-900/20" style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)" }}>
                  <s.I size={28} className="text-white" strokeWidth={2.2} />
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white dark:bg-ink-900 border-2 border-brand-500 text-brand-600 text-xs font-black flex items-center justify-center">{s.n}</span>
                </div>
                <h3 className="font-black text-lg text-ink-900 dark:text-ink-100 mb-2">{s.t}</h3>
                <p className="text-sm text-ink-600 dark:text-ink-400 leading-relaxed">{s.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-14 border-t border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900">
        <div className="mx-auto max-w-7xl px-4">
          <div className="max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100">{t(locale, "popular_searches_t")} {countryName}</h2>
            <p className="mt-3 text-sm md:text-base text-ink-600 dark:text-ink-400 leading-relaxed">
              {t(locale, "popular_searches_sub")}
            </p>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-3">{t(locale, "popular_brands")}</h3>
              <div className="flex flex-wrap gap-2">
                {popularBrandLinks.map((brand: any) => (
                  <Link key={brand.id} href={brand.slug ? lp(`/cars/brand/${brand.slug}`) : lp(`/cars?brand=${brand.id}`)} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">
                    {brand.name}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-3">{t(locale, "popular_cities")}</h3>
              <div className="flex flex-wrap gap-2">
                {topCityLinks.map((ct: any) => (
                  <Link key={ct.id} href={ct.slug ? lp(`/cars/city/${ct.slug}`) : lp(`/cars?city=${ct.id}`)} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">
                    {ct.name}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-3">{t(locale, "explore_more")}</h3>
              <div className="flex flex-wrap gap-2">
                <Link href={lp("/cars")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{t(locale, "link_all_cars")}</Link>
                <Link href={lp("/companies")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{t(locale, "link_verified_companies")}</Link>
                <Link href={lp("/brands")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{t(locale, "link_all_brands")}</Link>
                <Link href={lp("/blog")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{t(locale, "link_rental_blog")}</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-ink-50 dark:bg-ink-900/50 border-t border-ink-100 dark:border-ink-800">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100">{t(locale, "high_intent_t")}</h2>
          <p className="mt-2 text-sm text-ink-600 dark:text-ink-400 max-w-3xl">
            {t(locale, "high_intent_sub")}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {seoIntentLinks.map((page) => (
              <Link key={getSeoIntentPath(page)} href={lp(getSeoIntentPath(page))} className="rounded-full border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">
                {page.brandName} {intentLabel(page.intent)} in {page.cityName}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* HOMEPAGE FAQ — SEO-rich + JSON-LD */}
      <HomeFaqSection faqs={HOME_FAQS} locale={locale} />
      <FAQPageJsonLd faqs={HOME_FAQS}/>

    </>
  )
}

function SectionHead({ title, sub, cta }: { title: string; sub: string; cta?: { label: string; href: string } }) {
  return (
    <div className="flex items-end justify-between mb-7">
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100 tracking-tight leading-tight">{title}</h2>
        <p className="text-sm md:text-[15px] text-ink-500 mt-2 max-w-2xl">{sub}</p>
      </div>
      {cta && <a href={cta.href} className="text-sm font-bold text-brand-600 hover:text-brand-700 underline-offset-4 hover:underline">{cta.label} →</a>}
    </div>
  )
}

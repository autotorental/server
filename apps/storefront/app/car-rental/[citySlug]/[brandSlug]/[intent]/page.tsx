import Link from "next/link"
import { notFound } from "next/navigation"
import { api } from "@/lib/api"
import VehicleCard from "@/components/vehicle-card"
import { seoFor } from "@/lib/seo-helper"
import { BreadcrumbJsonLd, FAQPageJsonLd, ItemListJsonLd } from "@/components/jsonld"
import { STARTER_SEO_INTENT_PAGES, getSeoIntentPath, intentKeyword, intentLabel, type IntentSlug } from "@/lib/seo-intent-pages"
import { getLocale } from "@/lib/locale-server"
import { localizedPath } from "@/lib/locales"
import { intentPageContent, intentRoutePhrase } from "@/lib/seo-i18n"
import { translateBatch } from "@/lib/mt"

export const revalidate = 300

// Render ANY valid city/brand/intent on demand (not only generateStaticParams
// combos). Pairs with no inventory stay noindex (generateMetadata: noindex=!hasCars)
// and are excluded from sitemap.xml (inventorySet filter) — so no thin/empty page
// ever gets indexed, and uncurated valid combos no longer 404 regardless of the
// Next.js default.
export const dynamicParams = true

type Params = { citySlug: string; brandSlug: string; intent: IntentSlug }

const VALID_INTENTS: IntentSlug[] = ["daily", "monthly", "luxury"]

function fallbackTitle(city: string, brand: string, intent: IntentSlug) {
  const keyword = intentKeyword(intent)
  return `${brand} ${keyword} in ${city} | Auto to Rental`
}

function fallbackDescription(city: string, brand: string, intent: IntentSlug) {
  const keyword = intentKeyword(intent)
  return `Compare ${brand} ${keyword} offers in ${city}. See live inventory from verified rental companies and contact providers directly without commission.`
}

export async function generateStaticParams() {
  return STARTER_SEO_INTENT_PAGES.map((page) => ({
    citySlug: page.citySlug,
    brandSlug: page.brandSlug,
    intent: page.intent,
  }))
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { citySlug, brandSlug, intent } = await params
  if (!VALID_INTENTS.includes(intent)) return { title: "Not found" }
  const starter = STARTER_SEO_INTENT_PAGES.find(
    (page) => page.citySlug === citySlug && page.brandSlug === brandSlug && page.intent === intent
  )
  const cityName = starter?.cityName || citySlug.replace(/-/g, " ")
  const brandName = starter?.brandName || brandSlug.replace(/-/g, " ")
  // Thin-content guard: a city+brand combo with NO matching cars is a thin page.
  // noindex it (the sitemap also excludes it) so Google never indexes empty pages.
  let hasCars = false
  try {
    const [citiesRes, brandsRes] = await Promise.all([api.cities(), api.brands()])
    const city = (citiesRes.cities || []).find((x: any) => x.slug === citySlug)
    const brand = (brandsRes.brands || []).find((x: any) => x.slug === brandSlug)
    if (city && brand) {
      const vr = await api.vehicles({ city_id: city.id, brand_id: brand.id, limit: 1 })
      hasCars = (vr.vehicles?.length || 0) > 0
    }
  } catch {}
  return seoFor(getSeoIntentPath({ citySlug, brandSlug, intent }), {
    title: fallbackTitle(cityName, brandName, intent),
    description: fallbackDescription(cityName, brandName, intent),
    noindex: !hasCars,
    keywords: [
      `${brandName} rental ${cityName}`,
      `${intentLabel(intent)} ${brandName} rental ${cityName}`,
      `${brandName} car rental ${cityName}`,
    ],
  })
}

export default async function IntentPage({ params }: { params: Promise<Params> }) {
  const { citySlug, brandSlug, intent } = await params
  if (!VALID_INTENTS.includes(intent)) return notFound()

  const [citiesRes, brandsRes, locale] = await Promise.all([
    api.cities().catch(() => ({ cities: [] })),
    api.brands().catch(() => ({ brands: [] })),
    getLocale(),
  ])
  const lp = (p: string) => localizedPath(p, locale)
  const city = citiesRes.cities.find((item: any) => item.slug === citySlug)
  const brand = brandsRes.brands.find((item: any) => item.slug === brandSlug)
  if (!city || !brand) return notFound()

  const vehicleQuery: Record<string, string | number> = { city_id: city.id, brand_id: brand.id, limit: 60 }
  if (intent === "monthly") vehicleQuery.period = "monthly"
  const vehiclesRes = await api.vehicles(vehicleQuery).catch(() => ({ vehicles: [] }))
  const vehicles = vehiclesRes.vehicles
  const keyword = intentKeyword(intent)
  const m = intentPageContent(locale, brand.name, city.name, intent, vehicles.length)
  const faqs = m.faqs

  const relatedIntents = STARTER_SEO_INTENT_PAGES.filter(
    (page) => page.citySlug === citySlug && page.brandSlug === brandSlug && page.intent !== intent
  )
  const crossSellPages = STARTER_SEO_INTENT_PAGES.filter(
    (page) =>
      page.countryCode === city.country_code &&
      (page.citySlug === citySlug || page.brandSlug === brandSlug) &&
      !(page.citySlug === citySlug && page.brandSlug === brandSlug && page.intent === intent)
  ).slice(0, 8)

  const shown = vehicles.slice(0, 12)
  const __titles = await translateBatch(shown.map((x: any) => x.title), locale)
  const __titleById = new Map(shown.map((x: any, i: number) => [x.id, __titles[i]]))

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: m.bcHome, url: lp("/") },
          { name: m.bcCars, url: lp("/cars") },
          { name: city.name, url: lp(`/cars/city/${city.slug}`) },
          { name: brand.name, url: lp(`/cars/brand/${brand.slug}`) },
          { name: intentRoutePhrase(locale, brand.name, intent, city.name), url: lp(getSeoIntentPath({ citySlug, brandSlug, intent })) },
        ]}
      />
      <FAQPageJsonLd faqs={faqs} />
      <ItemListJsonLd
        name={`${brand.name} ${keyword} in ${city.name}`}
        items={vehicles.slice(0, 30).map((vehicle: any) => ({
          id: vehicle.id,
          slug: vehicle.slug,
          title: vehicle.title,
          price: vehicle.sale_daily_price || vehicle.daily_price,
          photo: vehicle.photos?.[0],
        }))}
      />

      <section className="bg-gradient-to-br from-brand-700 to-ink-900 text-white py-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-xs text-brand-200 mb-2 flex gap-2">
            <Link href={lp("/")} className="hover:text-white">{m.bcHome}</Link>
            <span>›</span>
            <Link href={lp("/cars")} className="hover:text-white">{m.bcCars}</Link>
            <span>›</span>
            <span>{intentRoutePhrase(locale, brand.name, intent, city.name)}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">
            {m.h1}
          </h1>
          <p className="mt-3 text-brand-100 max-w-3xl">
            {m.heroSub}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={lp(`/cars?city=${city.id}&brand=${brand.id}${intent === "monthly" ? "&period=monthly" : ""}`)} className="inline-flex items-center justify-center rounded-xl bg-white dark:bg-ink-900 px-5 py-3 text-sm font-bold text-brand-700 hover:bg-amber-300">
              {m.ctaInventory}
            </Link>
            <Link href={lp(`/cars/brand/${brand.slug}`)} className="inline-flex items-center justify-center rounded-xl border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:border-white">
              {m.ctaAllBrand}
            </Link>
            <Link href={lp(`/cars/city/${city.slug}`)} className="inline-flex items-center justify-center rounded-xl border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:border-white">
              {m.ctaAllCity}
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100">{m.dealsHeading}</h2>
          <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">
            {m.matchCount}
          </p>
          {vehicles.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-ink-100 dark:border-ink-800 bg-ink-50 dark:bg-ink-900/50 p-8 text-center text-ink-600 dark:text-ink-400">
              {m.noneMatch}
            </div>
          ) : (
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shown.map((vehicle: any) => (
                <VehicleCard key={vehicle.id} v={vehicle} brand={brand.name} city={city.name} locale={locale} displayTitle={__titleById.get(vehicle.id)} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-12 bg-ink-50 dark:bg-ink-900/50 border-y border-ink-100 dark:border-ink-800">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-black text-ink-900 dark:text-ink-100">{m.whyHeading}</h2>
          <div className="mt-4 space-y-3 text-sm text-ink-700 dark:text-ink-300 leading-relaxed">
            <p dangerouslySetInnerHTML={{ __html: m.whyP1 }}/>
            <p>{m.whyP2}</p>
            <p>{m.whyP3}</p>
          </div>
          {relatedIntents.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-2">{m.relatedHeading}</h3>
              <div className="flex flex-wrap gap-2">
                {relatedIntents.map((page) => (
                  <Link key={getSeoIntentPath(page)} href={lp(getSeoIntentPath(page))} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">
                    {intentRoutePhrase(locale, page.brandName, page.intent, page.cityName)}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="py-12 bg-white dark:bg-ink-900">
        <div className="mx-auto max-w-5xl px-4 grid gap-6 lg:grid-cols-2">
          <div className="surface-card p-5 md:p-6">
            <h2 className="text-xl font-black text-ink-900 dark:text-ink-100">{m.faqHeading}</h2>
            <div className="mt-3 space-y-2 text-sm text-ink-700 dark:text-ink-300">
              {faqs.map((faq, index) => (
                <p key={index}><strong>{faq.q}</strong> {faq.a}</p>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-ink-100 dark:border-ink-800 bg-ink-50 dark:bg-ink-900/50 p-5 md:p-6">
            <h2 className="text-xl font-black text-ink-900 dark:text-ink-100">{m.exploreHeading}</h2>
            <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">{m.exploreSub}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {crossSellPages.map((page) => (
                <Link key={getSeoIntentPath(page)} href={lp(getSeoIntentPath(page))} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">
                  {intentRoutePhrase(locale, page.brandName, page.intent, page.cityName)}
                </Link>
              ))}
              <Link href={lp("/companies")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{m.companiesLabel}</Link>
              <Link href={lp("/blog")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{m.blogLabel}</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

import Link from "next/link"
import { notFound } from "next/navigation"
import { loadCityPage } from "@/lib/dynamic-meta"
import VehicleCard from "@/components/vehicle-card"
import { seoFor } from "@/lib/seo-helper"
import { BreadcrumbJsonLd, ItemListJsonLd, FAQPageJsonLd } from "@/components/jsonld"
import { api } from "@/lib/api"
import { STARTER_SEO_INTENT_PAGES, getSeoIntentPath } from "@/lib/seo-intent-pages"
import { getLocale } from "@/lib/locale-server"
import { localizedPath, type Locale } from "@/lib/locales"
import { citySeo, intentRoutePhrase, type CityCtx } from "@/lib/seo-i18n"
import { t } from "@/lib/i18n"
import { translateText, translateBatch } from "@/lib/mt"

export const revalidate = 300

export async function generateStaticParams() {
  const c = await api.cities().catch(() => ({ cities: [] }))
  return c.cities.filter((x: any) => x.slug).map((x: any) => ({ slug: x.slug }))
}

async function ctxFrom(d: any, locale: Locale): Promise<CityCtx> {
  // Body types ("SUV", "Sedan", "Hatchback") are common nouns sourced from the
  // DB and get interpolated into the localized intro template, so translate them.
  // Brand names are proper nouns and stay as-is.
  const bodyTypes = await Promise.all(
    (d.bodyTypeCounts || []).map((b: any) => translateText(b.name, locale)),
  )
  return {
    name: d.city.name,
    count: d.count,
    priceLow: d.priceLow,
    priceHigh: d.priceHigh,
    brandNames: (d.brandCounts || []).map((b: any) => b.name),
    bodyTypes,
    country: d.city.country_code === "sy" ? "sy" : "ae",
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [d, locale] = await Promise.all([loadCityPage(slug), getLocale()])
  if (!d) return { title: "City not found" }
  const meta = citySeo(await ctxFrom(d, locale), locale)
  return seoFor(`/cars/city/${slug}`, { title: meta.title, description: meta.description, image: d.city.image_url, keywords: [meta.focusKeyword] })
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [d, locale] = await Promise.all([loadCityPage(slug), getLocale()])
  if (!d) return notFound()
  const lp = (p: string) => localizedPath(p, locale)
  const meta = citySeo(await ctxFrom(d, locale), locale)
  const faqs = meta.faqs
  const b = await api.brands().catch(() => ({ brands: [] }))
  const brandMap = new Map(b.brands.map((x: any) => [x.id, x.name]))
  const country = d.city.country_code === "sy" ? `🇸🇾 ${t(locale, "country_sy")}` : `🇦🇪 ${t(locale, "country_ae")}`
  const intentLinks = STARTER_SEO_INTENT_PAGES.filter((page) => page.citySlug === slug).slice(0, 6)
  const __titles = await translateBatch(d.vehicles.map((x: any) => x.title), locale)
  const __titleById = new Map(d.vehicles.map((x: any, i: number) => [x.id, __titles[i]]))

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: meta.bcHome, url: lp("/") }, { name: meta.bcCars, url: lp("/cars") }, { name: d.city.name, url: lp(`/cars/city/${slug}`) }]}/>
      <ItemListJsonLd name={`Cars for rent in ${d.city.name}`} items={d.vehicles.map((v: any) => ({ id: v.id, slug: v.slug, title: v.title, price: v.daily_price, photo: v.photos?.[0] }))}/>
      <FAQPageJsonLd faqs={faqs}/>

      <section className="relative">
        <div className="h-56 md:h-72 bg-gradient-to-br from-brand-700 to-brand-900 overflow-hidden relative">
          {d.city.image_url && <img src={d.city.image_url} alt={d.city.name} className="w-full h-full object-cover opacity-50"/>}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 to-transparent"/>
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto max-w-7xl px-4 w-full text-white">
              <div className="text-xs text-brand-200 mb-3 flex gap-2 items-center">
                <Link href={lp("/")} className="hover:text-white">{meta.bcHome}</Link><span>›</span>
                <Link href={lp("/cars")} className="hover:text-white">{meta.bcCars}</Link><span>›</span>
                <span>{d.city.name}</span>
              </div>
              <div className="inline-block bg-amber-300 text-ink-950 font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wider mb-3">{country}</div>
              <h1 className="text-3xl md:text-5xl font-black">{meta.title.split("|")[0].trim()}</h1>
              {d.city.name_ar && <div className="text-2xl text-brand-100 mt-2">{d.city.name_ar}</div>}
              <p className="text-brand-100 mt-2 max-w-2xl">{meta.heroSub}{d.priceLow && <> · {meta.fromPerDay}</>}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Unique intro */}
      <section className="py-10 bg-white dark:bg-ink-900">
        <div className="mx-auto max-w-4xl px-4">
          <p className="text-lg text-ink-700 dark:text-ink-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: meta.intro }}/>
        </div>
      </section>

      {/* Top brands available */}
      {d.brandCounts.length > 0 && (
        <section className="py-8 bg-ink-50 dark:bg-ink-900/50 border-y border-ink-100 dark:border-ink-800">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="text-lg font-bold text-ink-900 dark:text-ink-100 mb-4">{meta.topBrands}</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {d.brandCounts.map(b => (
                <div key={b.name} className="bg-white dark:bg-ink-900 rounded-xl border border-ink-100 dark:border-ink-800 p-3 text-center">
                  {b.logo ? <img src={b.logo} alt={b.name} className="h-8 mx-auto object-contain mb-1"/> : <div className="h-8 mb-1 font-bold text-ink-700 dark:text-ink-300">{b.name}</div>}
                  <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 truncate">{b.name}</div>
                  <div className="text-[10px] text-ink-500">{b.count} {b.count === 1 ? "car" : "cars"}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Cars grid */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100 mb-6">{meta.carsFor}</h2>
          {d.vehicles.length === 0 ? (
            <div className="bg-ink-50 dark:bg-ink-900/50 rounded-2xl p-16 text-center">
              <div className="text-5xl mb-3">🚗</div>
              <p className="text-ink-600 dark:text-ink-400">{meta.noneListed}</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {d.vehicles.map((v: any) => <VehicleCard key={v.id} v={v} brand={brandMap.get(v.brand_id)} city={d.city.name} locale={locale} displayTitle={__titleById.get(v.id)}/>)}
            </div>
          )}
        </div>
      </section>

      {intentLinks.length > 0 && (
        <section className="py-10 border-t border-ink-100 dark:border-ink-800 bg-ink-50 dark:bg-ink-900/50">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="text-xl md:text-2xl font-black text-ink-900 dark:text-ink-100">{meta.routesHeading}</h2>
            <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">{meta.routesSub}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {intentLinks.map((page) => (
                <Link key={getSeoIntentPath(page)} href={lp(getSeoIntentPath(page))} className="rounded-full border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">
                  {intentRoutePhrase(locale, page.brandName, page.intent, page.cityName)}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ — matches FAQPage schema for rich results */}
      <section className="py-12 border-t border-ink-100 dark:border-ink-800">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100 mb-6">{meta.faqHeading}</h2>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <details key={i} className="group rounded-xl border border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 p-4" {...(i === 0 ? { open: true } : {})}>
                <summary className="cursor-pointer list-none font-semibold text-ink-900 dark:text-ink-100 flex items-center justify-between gap-3">
                  {f.q}
                  <span className="text-ink-400 group-open:rotate-180 transition-transform">⌄</span>
                </summary>
                <p className="mt-3 text-ink-600 dark:text-ink-400 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

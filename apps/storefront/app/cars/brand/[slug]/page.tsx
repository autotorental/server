import Link from "next/link"
import { notFound } from "next/navigation"
import { loadBrandPage } from "@/lib/dynamic-meta"
import VehicleCard from "@/components/vehicle-card"
import { seoFor } from "@/lib/seo-helper"
import { SITE } from "@/lib/seo"
import { BreadcrumbJsonLd, ItemListJsonLd, FAQPageJsonLd } from "@/components/jsonld"
import { api } from "@/lib/api"
import { STARTER_SEO_INTENT_PAGES, getSeoIntentPath } from "@/lib/seo-intent-pages"
import { getLocale } from "@/lib/locale-server"
import { localizedPath } from "@/lib/locales"
import { brandSeo, intentRoutePhrase, type BrandCtx } from "@/lib/seo-i18n"
import { translateBatch } from "@/lib/mt"

export const revalidate = 300

export async function generateStaticParams() {
  const b = await api.brands().catch(() => ({ brands: [] }))
  return b.brands.filter((x: any) => x.slug).map((x: any) => ({ slug: x.slug }))
}

function ctxFrom(d: any): BrandCtx {
  return {
    name: d.brand.name,
    count: d.count,
    priceLow: d.priceLow,
    priceHigh: d.priceHigh,
    topModels: d.topModels,
    cityNames: d.cityNames,
    country: "ae",
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [d, locale] = await Promise.all([loadBrandPage(slug), getLocale()])
  if (!d) return { title: "Brand not found" }
  const meta = brandSeo(ctxFrom(d), locale)
  return seoFor(`/cars/brand/${slug}`, { title: meta.title, description: meta.description, image: d.brand.logo_url, keywords: [meta.focusKeyword] })
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [d, locale] = await Promise.all([loadBrandPage(slug), getLocale()])
  if (!d) return notFound()
  const lp = (p: string) => localizedPath(p, locale)
  const meta = brandSeo(ctxFrom(d), locale)
  const faqs = meta.faqs
  const [c, m] = await Promise.all([api.cities().catch(() => ({ cities: [] })), api.models(d.brand.id).catch(() => ({ models: [] }))])
  const cityMap = new Map(c.cities.map((x: any) => [x.id, x.name]))
  const intentLinks = STARTER_SEO_INTENT_PAGES.filter((page) => page.brandSlug === slug).slice(0, 6)
  const __titles = await translateBatch(d.vehicles.map((x: any) => x.title), locale)
  const __titleById = new Map(d.vehicles.map((x: any, i: number) => [x.id, __titles[i]]))

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: meta.bcHome, url: lp("/") }, { name: meta.bcBrands, url: lp("/brands") }, { name: d.brand.name, url: lp(`/cars/brand/${slug}`) }]}/>
      <ItemListJsonLd name={`${d.brand.name} cars for rent`} items={d.vehicles.map((v: any) => ({ id: v.id, slug: v.slug, title: v.title, price: v.daily_price, photo: v.photos?.[0] }))}/>
      <FAQPageJsonLd faqs={faqs}/>

      <section className="bg-gradient-to-br from-brand-700 to-brand-900 text-white py-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-xs text-brand-200 mb-3 flex gap-2 items-center">
            <Link href={lp("/")} className="hover:text-white">{meta.bcHome}</Link><span>›</span>
            <Link href={lp("/brands")} className="hover:text-white">{meta.bcBrands}</Link><span>›</span>
            <span>{d.brand.name}</span>
          </div>
          <div className="flex items-center gap-5 flex-wrap">
            {d.brand.logo_url && <div className="w-24 h-24 bg-white dark:bg-ink-900 rounded-2xl p-4 flex items-center justify-center shrink-0"><img src={d.brand.logo_url} alt={d.brand.name} className="max-w-full max-h-full object-contain"/></div>}
            <div>
              <h1 className="text-3xl md:text-5xl font-black">{meta.title.split("|")[0].trim()}</h1>
              <p className="text-brand-100 mt-2 max-w-2xl text-lg">{meta.heroSub}{d.priceLow && <> · {meta.fromPerDay}</>}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Unique intro paragraph using real data */}
      <section className="py-10 bg-white dark:bg-ink-900">
        <div className="mx-auto max-w-4xl px-4">
          <p className="text-lg text-ink-700 dark:text-ink-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: meta.intro }}/>
        </div>
      </section>

      {/* Popular models chips */}
      {d.topModels.length > 0 && (
        <section className="py-6 bg-ink-50 dark:bg-ink-900/50 border-y border-ink-100 dark:border-ink-800">
          <div className="mx-auto max-w-4xl px-4">
            <div className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-3">{meta.popularModels}</div>
            <div className="flex gap-2 flex-wrap">
              {d.topModels.map(m => (
                <span key={m.name} className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 rounded-full px-4 py-2 text-sm font-medium text-ink-700 dark:text-ink-300">
                  {m.name} <span className="text-ink-400 text-xs ml-1">{m.count}</span>
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Cars grid */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100 mb-6">{meta.availableCars}</h2>
          {d.vehicles.length === 0 ? (
            <div className="bg-ink-50 dark:bg-ink-900/50 rounded-2xl p-16 text-center">
              <div className="text-5xl mb-3">🚗</div>
              <p className="text-ink-600 dark:text-ink-400">{meta.noneListed} <Link href={lp("/cars")} className="text-brand-600 font-bold">{meta.browseAll}</Link></p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {d.vehicles.map((v: any) => <VehicleCard key={v.id} v={v} brand={d.brand.name} city={cityMap.get(v.city_id)} locale={locale} displayTitle={__titleById.get(v.id)}/>)}
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

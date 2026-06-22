import Link from "next/link"
import { api } from "@/lib/api"
import VehicleCard from "@/components/vehicle-card"
import { buildMetadata } from "@/lib/seo"
import { seoFor } from "@/lib/seo-helper"
import { BreadcrumbJsonLd, FAQPageJsonLd } from "@/components/jsonld"
import { getLocale } from "@/lib/locale-server"
import { localizedPath } from "@/lib/locales"
import { dubaiContent } from "@/lib/dubai-i18n"
import HomeFaqSection from "@/components/home-faq-section"
import { translateBatch } from "@/lib/mt"

export const revalidate = 300

export async function generateMetadata() {
  const locale = await getLocale()
  const d = dubaiContent("monthly", locale)
  return seoFor("/monthly-car-rental-dubai", {
    title: d.metaTitle,
    description: d.metaDesc,
    path: "/monthly-car-rental-dubai",
    locale,
    keywords: ["monthly car rental Dubai", "long term car rental Dubai", "monthly car hire Dubai", "monthly car rental UAE", "cheap monthly car rental Dubai"],
  })
}

export default async function Page() {
  const [b, c, locale] = await Promise.all([api.brands().catch(() => ({ brands: [] })), api.cities().catch(() => ({ cities: [] })), getLocale()])
  const lp = (p: string) => localizedPath(p, locale)
  const d = dubaiContent("monthly", locale)
  const dubai = c.cities.find((x: any) => x.name === "Dubai")
  const v = (await api.vehicles({ city_id: dubai?.id, limit: 12 }).catch(() => ({ vehicles: [] }))).vehicles
  const brandMap = new Map(b.brands.map((x: any) => [x.id, x.name]))
  const cityMap = new Map(c.cities.map((x: any) => [x.id, x.name]))
  const shown = v.slice(0, 8)
  const __titles = await translateBatch(shown.map((x: any) => x.title), locale)
  const __titleById = new Map(shown.map((x: any, i: number) => [x.id, __titles[i]]))
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: d.home, url: lp("/") }, { name: d.bc, url: lp("/monthly-car-rental-dubai") }]}/>
      <FAQPageJsonLd faqs={d.faqs}/>
      <section className="bg-gradient-to-br from-emerald-700 via-brand-800 to-ink-900 text-white py-16 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20"><img src="https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=2400" className="w-full h-full object-cover" alt=""/></div>
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="inline-flex items-center gap-2 bg-amber-400 text-ink-950 font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wider mb-5">{d.badge}</div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-tight">{d.h1a}<br/><span className="text-amber-300">{d.h1b}</span></h1>
          <p className="mt-5 text-lg text-ink-200 max-w-2xl">{d.heroSub}</p>
          <Link href={dubai ? lp(`/cars?city=${dubai.id}&period=monthly`) : lp("/cars?period=monthly")} className="mt-7 inline-block bg-white dark:bg-ink-900 text-brand-700 hover:bg-amber-300 hover:text-ink-950 font-bold px-7 py-3.5 rounded-xl">{d.cta}</Link>
        </div>
      </section>
      <section className="py-14"><div className="mx-auto max-w-7xl px-4"><h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100 mb-7">{d.carsTitle}</h2><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{shown.map((x: any) => <VehicleCard key={x.id} v={x} brand={brandMap.get(x.brand_id)} city={cityMap.get(x.city_id)} locale={locale} displayTitle={__titleById.get(x.id)}/>)}</div></div></section>
      <HomeFaqSection faqs={d.faqs} locale={locale} title={d.faqTitle}/>
    </>
  )
}

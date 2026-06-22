import Link from "next/link"
import { api } from "@/lib/api"
import VehicleCard from "@/components/vehicle-card"
import { buildMetadata } from "@/lib/seo"
import { seoFor } from "@/lib/seo-helper"
import { BreadcrumbJsonLd, FAQPageJsonLd } from "@/components/jsonld"
import { getLocale } from "@/lib/locale-server"
import { localizedPath } from "@/lib/locales"
import { dubaiContent } from "@/lib/dubai-i18n"
import { translateBatch } from "@/lib/mt"

export const revalidate = 300

export async function generateMetadata() {
  const locale = await getLocale()
  const d = dubaiContent("daily", locale)
  return seoFor("/daily-car-rental-dubai", {
    title: d.metaTitle,
    description: d.metaDesc,
    path: "/daily-car-rental-dubai",
    locale,
    keywords: ["daily car rental Dubai", "daily car hire Dubai", "rent a car daily Dubai", "car rental Dubai per day", "cheap daily car rental Dubai"],
  })
}

export default async function Page() {
  const [b, c, locale] = await Promise.all([api.brands().catch(() => ({ brands: [] })), api.cities().catch(() => ({ cities: [] })), getLocale()])
  const lp = (p: string) => localizedPath(p, locale)
  const d = dubaiContent("daily", locale)
  const dubai = c.cities.find((x: any) => x.name === "Dubai")
  const v = (await api.vehicles({ city_id: dubai?.id, limit: 12 }).catch(() => ({ vehicles: [] }))).vehicles
  const brandMap = new Map(b.brands.map((x: any) => [x.id, x.name]))
  const cityMap = new Map(c.cities.map((x: any) => [x.id, x.name]))
  const shown = v.slice(0, 8)
  const __titles = await translateBatch(shown.map((x: any) => x.title), locale)
  const __titleById = new Map(shown.map((x: any, i: number) => [x.id, __titles[i]]))
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: d.home, url: lp("/") }, { name: d.bc, url: lp("/daily-car-rental-dubai") }]}/>
      <FAQPageJsonLd faqs={d.faqs}/>
      <section className="bg-gradient-to-br from-emerald-700 via-brand-800 to-ink-900 text-white py-16 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20"><img src="https://images.unsplash.com/photo-1549924231-f129b911e442?w=2400" className="w-full h-full object-cover" alt=""/></div>
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="inline-flex items-center gap-2 bg-amber-400 text-ink-950 font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wider mb-5">{d.badge}</div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-tight">{d.h1a}<br/><span className="text-amber-300">{d.h1b}</span></h1>
          <p className="mt-5 text-lg text-ink-200 max-w-2xl">{d.heroSub}</p>
          <Link href={dubai ? lp(`/cars?city=${dubai.id}&period=daily`) : lp("/cars?period=daily")} className="mt-7 inline-block bg-white dark:bg-ink-900 text-brand-700 hover:bg-amber-300 hover:text-ink-950 font-bold px-7 py-3.5 rounded-xl">{d.cta}</Link>
        </div>
      </section>
      <section className="py-14"><div className="mx-auto max-w-7xl px-4"><h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100 mb-7">{d.carsTitle}</h2><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{shown.map((x: any) => <VehicleCard key={x.id} v={x} brand={brandMap.get(x.brand_id)} city={cityMap.get(x.city_id)} locale={locale} displayTitle={__titleById.get(x.id)}/>)}</div></div></section>
      <section className="py-14 bg-ink-50 dark:bg-ink-900/50"><div className="mx-auto max-w-3xl px-4"><h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100 mb-7">{d.faqTitle}</h2><div className="space-y-3">{d.faqs.map((f, i) => <details key={i} className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-xl p-5 group"><summary className="font-bold text-ink-900 dark:text-ink-100 cursor-pointer list-none flex items-center justify-between"><span>{f.q}</span><span className="group-open:rotate-180 transition">▾</span></summary><p className="mt-3 text-ink-700 dark:text-ink-300 text-sm leading-relaxed">{f.a}</p></details>)}</div></div></section>
    </>
  )
}

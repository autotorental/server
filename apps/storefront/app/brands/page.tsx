import Link from "next/link"
import { api } from "@/lib/api"
import { seoFor } from "@/lib/seo-helper"
import { BreadcrumbJsonLd, FAQPageJsonLd } from "@/components/jsonld"
import { getLocale } from "@/lib/locale-server"
import { localizedPath } from "@/lib/locales"
import { brandsContent } from "@/lib/index-i18n"
import { translateBatch } from "@/lib/mt"

export const revalidate = 60

export async function generateMetadata() {
  const locale = await getLocale()
  const c = brandsContent(locale)
  return seoFor("/brands", {
    title: c.metaTitle,
    description: c.metaDesc,
    keywords: ["car rental brands UAE", "rent car by brand Dubai", "brand pages car rental", "luxury brand rental UAE"],
  })
}

const COUNTRIES: Record<string,string> = { JP: "🇯🇵", DE: "🇩🇪", US: "🇺🇸", IT: "🇮🇹", KR: "🇰🇷", GB: "🇬🇧", FR: "🇫🇷", SE: "🇸🇪", CZ: "🇨🇿", CN: "🇨🇳", ES: "🇪🇸", IN: "🇮🇳", MY: "🇲🇾", AT: "🇦🇹" }

export default async function BrandsPage() {
  const [b, v, locale] = await Promise.all([api.brands(), api.vehicles({ limit: 200 }).catch(() => ({ vehicles: [] })), getLocale()])
  const lp = (p: string) => localizedPath(p, locale)
  const c = brandsContent(locale)
  const counts = new Map<string, number>()
  for (const veh of v.vehicles) counts.set(veh.brand_id, (counts.get(veh.brand_id) || 0) + 1)
  // Show brands that actually have cars first, then the rest in curated order
  // (sort_order ascending: Toyota, BMW, Mercedes… lead; niche/new brands follow).
  const sorted = [...b.brands].sort((a: any, b: any) => {
    const ha = (counts.get(a.id) || 0) > 0 ? 1 : 0
    const hb = (counts.get(b.id) || 0) > 0 ? 1 : 0
    if (ha !== hb) return hb - ha
    return (a.sort_order || 0) - (b.sort_order || 0)
  })

  // Group brands by country of origin (Germany group, France group, …).
  const COUNTRY_NAMES: Record<string, string> = {
    DE: "Germany", FR: "France", JP: "Japan", US: "United States", IT: "Italy",
    GB: "United Kingdom", KR: "South Korea", SE: "Sweden", CN: "China", ES: "Spain",
    IN: "India", CZ: "Czechia", AT: "Austria", IR: "Iran", RU: "Russia", VN: "Vietnam",
    HR: "Croatia", RO: "Romania", MY: "Malaysia", NL: "Netherlands",
  }
  const groupsMap = new Map<string, any[]>()
  for (const br of sorted) {
    const cc = (br.origin_country || "ZZ").toUpperCase()
    if (!groupsMap.has(cc)) groupsMap.set(cc, [])
    groupsMap.get(cc)!.push(br)
  }
  const groups = [...groupsMap.entries()]
    .map(([cc, brs]) => ({ cc, brs, cars: brs.reduce((sum, br) => sum + (counts.get(br.id) || 0), 0) }))
    .sort((a, b) => (b.cars - a.cars) || (b.brs.length - a.brs.length))
  const groupLabels = await translateBatch(groups.map((g) => COUNTRY_NAMES[g.cc] || g.cc), locale)

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: c.bcHome, url: lp("/") }, { name: c.bcBrands, url: lp("/brands") }]}/>
      <FAQPageJsonLd faqs={c.faqs}/>
      <section className="bg-gradient-to-br from-brand-600 to-brand-900 text-white py-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-xs text-brand-200 mb-2 flex gap-2">
            <Link href={lp("/")} className="hover:text-white">{c.bcHome}</Link><span>›</span><span>{c.bcBrands}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">{c.h1.replace("{n}", String(b.brands.length))}</h1>
          <p className="mt-3 text-brand-100">{c.heroSub}</p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="space-y-10">
            {groups.map((g, gi) => (
              <div key={g.cc}>
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="text-2xl">{COUNTRIES[g.cc] || "\ud83c\udf10"}</span>
                  <h2 className="text-lg md:text-xl font-black text-ink-900 dark:text-ink-100">{groupLabels[gi]}</h2>
                  <span className="text-xs font-semibold text-ink-500 bg-ink-100 dark:bg-ink-800 rounded-full px-2 py-0.5">{g.brs.length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {g.brs.map((br: any) => {
              const count = counts.get(br.id) || 0
              return (
                <Link key={br.id} href={lp(br.slug ? `/cars/brand/${br.slug}` : `/cars?brand=${br.id}`)} className="group bg-white dark:bg-ink-900 rounded-2xl border border-ink-100 dark:border-ink-800 hover:border-brand-400 hover:shadow-cardHover hover:-translate-y-0.5 transition-all p-5 text-center">
                  <div className="h-14 flex items-center justify-center mb-3">
                    {br.logo_url ? (
                      <img src={br.logo_url} alt={br.name} className="max-h-12 max-w-full object-contain"/>
                    ) : (
                      <span className="font-black text-xl text-ink-700 dark:text-ink-300">{br.name}</span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-ink-900 dark:text-ink-100 group-hover:text-brand-600 leading-tight">{br.name}</div>
                  <div className="text-[11px] text-ink-500 mt-1 flex items-center justify-center gap-1.5">
                    {br.origin_country && COUNTRIES[br.origin_country.toUpperCase()] ? COUNTRIES[br.origin_country.toUpperCase()] : null}
                    <span>{count > 0 ? c.carsWord(count) : c.comingSoon}</span>
                  </div>
                </Link>
              )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 border-t border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900">
        <div className="mx-auto max-w-7xl px-4 grid gap-6 lg:grid-cols-2">
          <div className="surface-card p-5 md:p-6">
            <h2 className="text-xl font-black text-ink-900 dark:text-ink-100">{c.moveHeading}</h2>
            <p className="mt-2 text-sm text-ink-600 dark:text-ink-400 leading-relaxed">
              {c.movePara}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={lp("/cars")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{c.allCars}</Link>
              <Link href={lp("/cars?period=monthly")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{c.monthlyDeals}</Link>
              <Link href={lp("/companies")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{c.verifiedCompanies}</Link>
            </div>
          </div>
          <div className="rounded-2xl border border-ink-100 dark:border-ink-800 bg-ink-50 dark:bg-ink-900/50 p-5 md:p-6">
            <h2 className="text-xl font-black text-ink-900 dark:text-ink-100">{c.faqHeading}</h2>
            <div className="mt-3 space-y-2 text-sm text-ink-700 dark:text-ink-300 leading-relaxed">
              {c.faqs.map((faq, index) => (
                <p key={index}><strong>{faq.q}</strong> {faq.a}</p>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

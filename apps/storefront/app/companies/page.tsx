import Link from "next/link"
import { api } from "@/lib/api"
import { Star, ShieldCheck } from "lucide-react"
import { seoFor } from "@/lib/seo-helper"
import { BreadcrumbJsonLd, FAQPageJsonLd } from "@/components/jsonld"
import { getLocale } from "@/lib/locale-server"
import { localizedPath } from "@/lib/locales"
import { companiesContent } from "@/lib/index-i18n"

export const revalidate = 60

export async function generateMetadata() {
  const locale = await getLocale()
  const c = companiesContent(locale)
  return seoFor("/companies", {
    title: c.metaTitle,
    description: c.metaDesc,
  })
}

export default async function CompaniesPage() {
  const [s, v, locale] = await Promise.all([api.sellers().catch(() => ({ sellers: [] })), api.vehicles({ limit: 200 }).catch(() => ({ vehicles: [] })), getLocale()])
  const lp = (p: string) => localizedPath(p, locale)
  const c = companiesContent(locale)
  const counts = new Map<string, number>()
  for (const veh of v.vehicles) counts.set(veh.seller_id, (counts.get(veh.seller_id) || 0) + 1)

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: c.bcHome, url: lp("/") }, { name: c.bcCompanies, url: lp("/companies") }]}/>
      <FAQPageJsonLd faqs={c.faqs}/>
      <section className="bg-gradient-to-br from-brand-600 to-brand-900 text-white py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-xs text-brand-200 mb-2 flex gap-2">
            <Link href={lp("/")} className="hover:text-white">{c.bcHome}</Link><span>›</span><span>{c.bcCompanies}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">{c.h1}</h1>
          <p className="mt-3 text-brand-100 max-w-2xl">{c.heroSub.replace("{n}", String(s.sellers.length))}</p>
        </div>
      </section>

      <section className="py-12 md:py-14">
        <div className="mx-auto max-w-7xl px-4">
          {s.sellers.length === 0 ? (
            <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-2xl p-16 text-center">
              <div className="text-5xl mb-4">🏢</div>
              <h3 className="text-xl font-bold text-ink-900 dark:text-ink-100">{c.noneTitle}</h3>
              <Link href={lp("/list-your-car")} className="btn-primary inline-flex mt-5">{c.beFirst}</Link>
            </div>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {s.sellers.map((sel: any) => {
                  const carCount = counts.get(sel.id) || 0
                  return (
                    <Link key={sel.id} href={lp(`/companies/${sel.handle || sel.id}`)} className="group surface-card interactive-card rounded-2xl overflow-hidden">
                      <div className="h-32 bg-gradient-to-br from-brand-100 to-brand-200 relative">
                        {sel.banner && <img src={sel.banner} alt="" className="w-full h-full object-cover"/>}
                      </div>
                      <div className="p-5 relative">
                        <div className="absolute -top-10 left-5 w-20 h-20 bg-white dark:bg-ink-900 rounded-2xl border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                          {sel.logo ? <img src={sel.logo} alt={sel.name} className="w-full h-full object-cover"/> : <span className="font-black text-2xl text-brand-600">{sel.name[0]}</span>}
                        </div>
                        <div className="pt-10">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg text-ink-900 dark:text-ink-100 group-hover:text-brand-600 truncate">{sel.name}</h3>
                            <ShieldCheck size={16} className="text-brand-600 shrink-0" aria-label="Verified"/>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-ink-500">
                            <span className="inline-flex items-center gap-1 text-amber-500"><Star size={12} fill="currentColor"/><span className="text-ink-700 dark:text-ink-300 font-semibold">4.8</span></span>
                            <span>·</span>
                            <span>{c.carsListed(carCount)}</span>
                          </div>
                          {sel.description && <p className="text-sm text-ink-600 dark:text-ink-400 mt-3 line-clamp-2">{sel.description}</p>}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50 via-white to-brand-50 p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-brand-700">{c.promoLabel}</div>
                  <h2 className="mt-1 text-xl font-black text-ink-900 dark:text-ink-100">{c.promoTitle}</h2>
                  <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">{c.promoSub}</p>
                </div>
                <Link href={lp("/list-your-car")} className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700 transition">
                  {c.becomeFeatured}
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="py-12 border-t border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900">
        <div className="mx-auto max-w-7xl px-4 grid gap-6 lg:grid-cols-2">
          <div className="surface-card p-5 md:p-6">
            <h2 className="text-2xl font-black text-ink-900 dark:text-ink-100">{c.findHeading}</h2>
            <p className="mt-3 text-sm text-ink-600 dark:text-ink-400 leading-relaxed">
              {c.findPara}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={lp("/cars")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{c.allCars}</Link>
              <Link href={lp("/brands")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{c.carBrands}</Link>
              <Link href={lp("/blog")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{c.rentalGuides}</Link>
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

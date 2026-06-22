import Link from "next/link"
import { POSTS } from "@/lib/blog-posts"
import { seoFor } from "@/lib/seo-helper"
import { BreadcrumbJsonLd } from "@/components/jsonld"
import { Calendar, Clock } from "lucide-react"
import { getLocale } from "@/lib/locale-server"
import { localizedPath, LOCALE_INFO } from "@/lib/locales"
import { blogContent } from "@/lib/static-i18n-2"
import { translateBatch } from "@/lib/mt"

export const revalidate = 60

export async function generateMetadata() {
  const locale = await getLocale()
  const c = blogContent(locale)
  return seoFor("/blog", {
    title: c.metaTitle,
    description: c.metaDesc,
    keywords: ["car rental blog Dubai", "car rental tips UAE", "Dubai car hire guide", "luxury car rental Dubai blog"],
  })
}

export default async function BlogIndex() {
  const locale = await getLocale()
  const lp = (p: string) => localizedPath(p, locale)
  const c = blogContent(locale)
  const dateLocale = LOCALE_INFO[locale].hreflang
  const sorted = [...POSTS].sort((a, b) => b.published_at.localeCompare(a.published_at))
  const featured = sorted[0]
  const rest = sorted.slice(1)

  // Translate post titles, descriptions and categories in a single batched call.
  const tFields = sorted.flatMap(p => [p.title, p.description, p.category])
  const tr = await translateBatch(tFields, locale)
  const tBySlug: Record<string, { title: string; description: string; category: string }> = {}
  sorted.forEach((p, i) => {
    tBySlug[p.slug] = { title: tr[i * 3], description: tr[i * 3 + 1], category: tr[i * 3 + 2] }
  })
  const tf = tBySlug[featured.slug]

  const categories = [...new Set(sorted.map(p => tBySlug[p.slug].category))]

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: c.bcHome, url: lp("/") }, { name: c.bcBlog, url: lp("/blog") }]}/>

      <section className="bg-gradient-to-br from-brand-700 via-brand-800 to-ink-900 text-white py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-xs text-brand-200 mb-3"><Link href={lp("/")} className="hover:text-white">{c.bcHome}</Link> › {c.bcBlog}</div>
          <h1 className="text-4xl md:text-5xl font-black">{c.h1}</h1>
          <p className="mt-3 text-brand-100 text-lg max-w-2xl">{c.heroSub}</p>
        </div>
      </section>

      {/* Featured post */}
      <section className="py-12 md:py-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-[11px] uppercase tracking-wider text-brand-600 font-bold mb-3">{c.featuredLabel}</div>
          <Link href={lp(`/blog/${featured.slug}`)} className="group block surface-card interactive-card rounded-2xl overflow-hidden grid md:grid-cols-[1.2fr_1fr] gap-0">
            <div className="aspect-[16/10] md:aspect-auto bg-ink-100 dark:bg-ink-800 overflow-hidden">
              <img src={featured.cover} alt={featured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
            </div>
            <div className="p-8 md:p-10 flex flex-col justify-center">
              <div className="text-[11px] uppercase tracking-wider text-brand-600 font-bold mb-3">{tf.category}</div>
              <h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100 leading-tight group-hover:text-brand-600 transition">{tf.title}</h2>
              <p className="mt-3 text-ink-600 dark:text-ink-400 leading-relaxed">{tf.description}</p>
              <div className="mt-5 flex items-center gap-4 text-xs text-ink-500">
                <span className="inline-flex items-center gap-1"><Calendar size={12}/>{new Date(featured.published_at).toLocaleDateString(dateLocale, { year: "numeric", month: "long", day: "numeric" })}</span>
                <span className="inline-flex items-center gap-1"><Clock size={12}/>{featured.read_time} {c.minRead}</span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="pb-4">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <span key={cat} className="bg-ink-50 dark:bg-ink-900/50 text-ink-700 dark:text-ink-300 px-3 py-1.5 rounded-full text-xs font-semibold">{cat}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="py-6">
        <div className="mx-auto max-w-7xl px-4">
          <div className="rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50 via-white to-brand-50 p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-brand-700">{c.promoLabel}</div>
              <h2 className="mt-1 text-xl font-black text-ink-900 dark:text-ink-100">{c.promoTitle}</h2>
              <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">{c.promoSub}</p>
            </div>
            <Link href={lp("/list-your-car")} className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700 transition">
              {c.promoteCta}
            </Link>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="py-10 md:py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rest.map(p => (
              <Link key={p.slug} href={lp(`/blog/${p.slug}`)} className="group surface-card interactive-card rounded-2xl overflow-hidden flex flex-col">
                <div className="aspect-[16/10] bg-ink-100 dark:bg-ink-800 overflow-hidden">
                  <img src={p.cover} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="text-[10px] uppercase tracking-wider text-brand-600 font-bold mb-2">{tBySlug[p.slug].category}</div>
                  <h3 className="font-bold text-ink-900 dark:text-ink-100 leading-tight group-hover:text-brand-600 transition flex-1">{tBySlug[p.slug].title}</h3>
                  <p className="mt-2 text-sm text-ink-600 dark:text-ink-400 line-clamp-2">{tBySlug[p.slug].description}</p>
                  <div className="mt-4 pt-4 border-t border-ink-100 dark:border-ink-800 flex items-center justify-between text-xs text-ink-500">
                    <span>{new Date(p.published_at).toLocaleDateString(dateLocale, { month: "short", day: "numeric" })}</span>
                    <span>{p.read_time} {c.minRead}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 md:py-12 border-t border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900">
        <div className="mx-auto max-w-7xl px-4 grid gap-6 lg:grid-cols-2">
          <div className="surface-card p-5 md:p-6">
            <h2 className="text-2xl font-black text-ink-900 dark:text-ink-100">{c.linksHeading}</h2>
            <p className="mt-3 text-sm text-ink-600 dark:text-ink-400 leading-relaxed">
              {c.linksPara}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={lp("/cars")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{c.browseAll}</Link>
              <Link href={lp("/cars?period=monthly")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{c.monthlyDeals}</Link>
              <Link href={lp("/companies")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{c.verifiedCompanies}</Link>
              <Link href={lp("/brands")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{c.popularBrands}</Link>
            </div>
          </div>
          <div className="rounded-2xl border border-ink-100 dark:border-ink-800 bg-ink-50 dark:bg-ink-900/50 p-5 md:p-6">
            <h2 className="text-xl font-black text-ink-900 dark:text-ink-100">{c.faqHeading}</h2>
            <div className="mt-3 space-y-2 text-sm text-ink-700 dark:text-ink-300 leading-relaxed">
              <p><strong>{c.faqPricesQ}</strong> {c.faqPricesA}</p>
              <p><strong>{c.faqBookQ}</strong> {c.faqBookA}</p>
              <p><strong>{c.faqCompaniesQ}</strong> {c.faqCompaniesAPre}<Link href={lp("/list-your-car")} className="text-brand-600 font-semibold hover:text-brand-700">{c.listYourCar}</Link>{c.faqCompaniesAPost}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-10 bg-gradient-to-br from-brand-600 to-brand-900 text-white text-center">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-3xl font-black">{c.ctaTitle}</h2>
          <p className="mt-3 text-brand-100">{c.ctaSub}</p>
          <Link href={lp("/cars")} className="mt-6 inline-block bg-white dark:bg-ink-900 text-brand-700 hover:bg-amber-300 hover:text-ink-950 font-bold px-7 py-3.5 rounded-xl">{c.ctaBtn}</Link>
        </div>
      </section>
    </>
  )
}

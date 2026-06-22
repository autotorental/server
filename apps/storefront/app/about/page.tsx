import Link from "next/link"
import { ShieldCheck, Users, MessageCircle, BadgePercent, Zap, Heart } from "lucide-react"
import { getLocale } from "@/lib/locale-server"
import { localizedPath } from "@/lib/locales"
import { seoFor } from "@/lib/seo-helper"
import { aboutContent } from "@/lib/static-i18n"

export const revalidate = 60

export async function generateMetadata() {
  const locale = await getLocale()
  const c = aboutContent(locale)
  return seoFor("/about", { title: c.metaTitle, description: c.metaDesc })
}

const VALUE_ICONS = [ShieldCheck, BadgePercent, MessageCircle, Users, Zap, Heart]

export default async function AboutPage() {
  const locale = await getLocale()
  const lp = (p: string) => localizedPath(p, locale)
  const c = aboutContent(locale)

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-700 via-brand-800 to-ink-900 text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=2400" alt="" className="w-full h-full object-cover"/>
        </div>
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="text-xs text-brand-200 mb-3 flex gap-2 items-center">
            <Link href={lp("/")} className="hover:text-white">{c.bcHome}</Link><span>›</span><span>{c.bcAbout}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black leading-[1.05] tracking-tight max-w-3xl">
            {c.heroTitlePre}<span className="text-amber-300">{c.heroTitleHighlight}</span>{c.heroTitlePost}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-200 leading-relaxed">
            {c.heroSub}
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-brand-600 font-bold text-sm uppercase tracking-wider mb-3">{c.storyEyebrow}</div>
          <h2 className="text-3xl md:text-4xl font-black text-ink-900 dark:text-ink-100 mb-6">{c.storyHeading}</h2>
          <div className="space-y-5 text-ink-700 dark:text-ink-300 leading-relaxed text-lg">
            <p>{c.storyP1}</p>
            <p>
              {c.storyP2Pre}<strong>{c.storyP2Strong}</strong>{c.storyP2Post}
            </p>
            <p>{c.storyP3}</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-ink-50 dark:bg-ink-900/50">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {c.stats.map(s => (
              <div key={s.l}>
                <div className="text-4xl md:text-5xl font-black text-brand-600">{s.v}</div>
                <div className="text-sm text-ink-600 dark:text-ink-400 mt-2">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-14">
            <div className="text-brand-600 font-bold text-sm uppercase tracking-wider mb-3">{c.valuesEyebrow}</div>
            <h2 className="text-3xl md:text-4xl font-black text-ink-900 dark:text-ink-100">{c.valuesHeading}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {c.values.map((v, i) => {
              const I = VALUE_ICONS[i] || ShieldCheck
              return (
                <div key={v.t} className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 hover:border-brand-300 hover:shadow-cardHover rounded-2xl p-6 transition">
                  <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4"><I size={22}/></div>
                  <h3 className="font-bold text-lg text-ink-900 dark:text-ink-100 mb-2">{v.t}</h3>
                  <p className="text-sm text-ink-600 dark:text-ink-400 leading-relaxed">{v.s}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-brand-600 to-brand-900 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">{c.ctaHeading}</h2>
          <p className="text-lg text-brand-100 mb-7">{c.ctaSub}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href={lp("/cars")} className="bg-white dark:bg-ink-900 text-brand-700 hover:bg-amber-300 hover:text-ink-900 dark:text-ink-100 font-bold px-7 py-3.5 rounded-xl transition">{c.ctaBrowse}</Link>
            <Link href={lp("/list-your-car")} className="border border-white/30 hover:border-white text-white font-semibold px-7 py-3.5 rounded-xl transition">{c.ctaList}</Link>
          </div>
        </div>
      </section>
    </>
  )
}

import Link from "next/link"
import { seoFor } from "@/lib/seo-helper"
import { getLocale } from "@/lib/locale-server"
import { localizedPath } from "@/lib/locales"
import { cookiesContent } from "@/lib/legal-i18n"
import { translateHtml } from "@/lib/mt"

export const revalidate = 60

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.autotorental.com"
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

export async function generateMetadata() {
  const locale = await getLocale()
  const c = cookiesContent(locale)
  return seoFor("/cookies", { title: c.metaTitle, description: c.metaDesc })
}

async function fetchManagedCookies() {
  try {
    const r = await fetch(`${API}/store/legal-pages/cookies`, {
      headers: PK ? { "x-publishable-api-key": PK } : {},
      next: { revalidate: 60 },
    })
    if (!r.ok) return null
    const d = await r.json()
    const content = d?.page?.content?.trim?.()
    if (!content) return null
    return { content, updated_at: d?.page?.updated_at || null }
  } catch {
    return null
  }
}

export default async function CookiesPage() {
  const [managed, locale] = await Promise.all([fetchManagedCookies(), getLocale()])
  const lp = (p: string) => localizedPath(p, locale)
  const c = cookiesContent(locale)
  const managedHtml = await translateHtml(managed?.content, locale)

  if (managed) {
    return (
      <article className="mx-auto max-w-3xl px-4 py-14 content-prose">
        <div className="text-xs text-ink-500 mb-3"><Link href={lp("/")} className="hover:text-brand-600">{c.bcHome}</Link> › {c.bcLabel}</div>
        <h1 className="text-3xl md:text-4xl font-black text-ink-900 dark:text-ink-100">{c.h1}</h1>
        <p className="text-ink-500 mt-2">{c.lastUpdated} {String(managed.updated_at || "N/A").slice(0, 10)}</p>
        <div className="mt-5 rounded-2xl border border-ink-100 dark:border-ink-800 bg-ink-50 dark:bg-ink-900/50 p-4">
          <h2 className="text-base font-bold text-ink-900 dark:text-ink-100 m-0">{c.quickLinksTitle}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={lp("/privacy")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{c.linkPrivacy}</Link>
            <Link href={lp("/terms")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{c.linkTerms}</Link>
            <Link href={lp("/contact")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{c.linkContact}</Link>
          </div>
        </div>
        <div className="mt-8 text-ink-700 dark:text-ink-300 leading-relaxed text-[15px] space-y-3" dangerouslySetInnerHTML={{ __html: managedHtml }} />
      </article>
    )
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-14 content-prose">
      <div className="text-xs text-ink-500 mb-3"><Link href={lp("/")} className="hover:text-brand-600">{c.bcHome}</Link> › {c.bcLabel}</div>
      <h1 className="text-3xl md:text-4xl font-black text-ink-900 dark:text-ink-100">{c.h1}</h1>
      <p className="text-ink-500 mt-2">{c.lastUpdated} {c.updatedValue}</p>
      <div className="mt-5 rounded-2xl border border-ink-100 dark:border-ink-800 bg-ink-50 dark:bg-ink-900/50 p-4">
        <h2 className="text-base font-bold text-ink-900 dark:text-ink-100 m-0">{c.quickLinksTitle}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={lp("/privacy")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{c.linkPrivacy}</Link>
          <Link href={lp("/terms")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{c.linkTerms}</Link>
          <Link href={lp("/contact")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{c.linkContact}</Link>
        </div>
      </div>

      <Section title={c.whatTitle}>
        {c.whatBody}
      </Section>

      <Section title={c.essentialTitle}>
        {c.essentialRows.map((row, i) => (
          <Cookie key={i} name={row.name} purpose={row.purpose} />
        ))}
      </Section>

      <Section title={c.adTitle}>
        {c.adIntro}
        {c.adRows.map((row, i) => (
          <Cookie key={i} name={row.name} purpose={row.purpose} />
        ))}
      </Section>

      <Section title={c.changeTitle}>
        {c.changeBody[0]}<code>cookie_consent</code>{c.changeBody[1]}
      </Section>

      <Section title={c.moreTitle}>
        {c.moreBody.split("{link}")[0]}
        <Link href={lp("/privacy")}>{c.moreLinkLabel}</Link>
        {c.moreBody.split("{link}")[1]}
      </Section>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-ink-900 dark:text-ink-100 mb-3">{title}</h2>
      <div className="text-ink-700 dark:text-ink-300 leading-relaxed text-[15px] space-y-3">{children}</div>
    </section>
  )
}

function Cookie({ name, purpose }: { name: string; purpose: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-ink-100 dark:border-ink-800 text-sm">
      <code className="text-brand-700 bg-brand-50 px-2 py-0.5 rounded shrink-0">{name}</code>
      <span className="text-ink-600 dark:text-ink-400 text-right">{purpose}</span>
    </div>
  )
}

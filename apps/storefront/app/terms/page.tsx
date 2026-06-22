import Link from "next/link"
import { seoFor } from "@/lib/seo-helper"
import { getLocale } from "@/lib/locale-server"
import { localizedPath } from "@/lib/locales"
import { termsContent } from "@/lib/legal-i18n"
import { translateHtml } from "@/lib/mt"

export const revalidate = 60

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.autotorental.com"
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

export async function generateMetadata() {
  const locale = await getLocale()
  const c = termsContent(locale)
  return seoFor("/terms", { title: c.metaTitle, description: c.metaDesc })
}

async function fetchManagedTerms() {
  try {
    const r = await fetch(`${API}/store/legal-pages/terms`, {
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

export default async function TermsPage() {
  const [managed, locale] = await Promise.all([fetchManagedTerms(), getLocale()])
  const lp = (p: string) => localizedPath(p, locale)
  const c = termsContent(locale)
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
            <Link href={lp("/cookies")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{c.linkCookies}</Link>
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
          <Link href={lp("/cookies")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{c.linkCookies}</Link>
          <Link href={lp("/contact")} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{c.linkContact}</Link>
        </div>
      </div>

      {c.sections.map((s, i) => (
        <Section key={i} title={s.h}>
          {s.body.length > 1 ? (
            <ul>{s.body.map((b, j) => <li key={j}>{b}</li>)}</ul>
          ) : (
            <p>{s.body[0]}</p>
          )}
        </Section>
      ))}
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

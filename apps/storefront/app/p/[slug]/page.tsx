import Link from "next/link"
import { notFound } from "next/navigation"
import { seoFor } from "@/lib/seo-helper"
import { getLocale } from "@/lib/locale-server"
import { localizedPath } from "@/lib/locales"
import { translateHtml, translateText } from "@/lib/mt"

export const revalidate = 60

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.autotorental.com"
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

async function fetchPage(slug: string) {
  try {
    const r = await fetch(`${API}/store/pages/${encodeURIComponent(slug)}`, {
      headers: PK ? { "x-publishable-api-key": PK } : {},
      next: { revalidate: 60 },
    })
    if (!r.ok) return null
    const d = await r.json()
    return d?.page || null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await fetchPage(slug)
  if (!page) return { title: "Page not found" }
  const locale = await getLocale()
  const title = await translateText(page.meta_title || page.title, locale)
  const description = page.meta_description ? await translateText(page.meta_description, locale) : undefined
  return seoFor(`/p/${slug}`, { title, description })
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [page, locale] = await Promise.all([fetchPage(slug), getLocale()])
  if (!page) return notFound()
  const lp = (p: string) => localizedPath(p, locale)
  const [title, html, home] = await Promise.all([
    translateText(page.title, locale),
    translateHtml(page.content, locale),
    translateText("Home", locale),
  ])
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 content-prose">
      <div className="text-xs text-ink-500 mb-3">
        <Link href={lp("/")} className="hover:text-brand-600">{home}</Link> › {title}
      </div>
      <h1 className="text-3xl md:text-4xl font-black text-ink-900 dark:text-ink-100">{title}</h1>
      <div
        className="mt-8 text-ink-700 dark:text-ink-300 leading-relaxed text-[15px] space-y-3"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  )
}

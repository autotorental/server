import Link from "next/link"
import { getLocale } from "@/lib/locale-server"
import { localizedPath } from "@/lib/locales"
import { seoFor } from "@/lib/seo-helper"
import { contactContent } from "@/lib/static-i18n"
import ContactForm from "./contact-form"

export const revalidate = 60

export async function generateMetadata() {
  const locale = await getLocale()
  const c = contactContent(locale)
  return seoFor("/contact", { title: c.metaTitle, description: c.metaDesc })
}

export default async function ContactPage() {
  const locale = await getLocale()
  const lp = (p: string) => localizedPath(p, locale)
  const c = contactContent(locale)

  return (
    <>
      <section className="bg-gradient-to-br from-brand-600 to-brand-900 text-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-xs text-brand-200 mb-3 flex gap-2 items-center">
            <Link href={lp("/")} className="hover:text-white">{c.bcHome}</Link><span>›</span><span>{c.bcContact}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black">{c.heroTitle}</h1>
          <p className="mt-3 text-brand-100 text-lg max-w-xl">{c.heroSub}</p>
        </div>
      </section>

      <section className="py-12 md:py-14">
        <div className="mx-auto max-w-6xl px-4 grid lg:grid-cols-3 gap-10">
          <ContactForm c={c} privacyHref={lp("/privacy")} />
        </div>
      </section>

      {/* Location — Zayed Road, Dubai */}
      <section className="pb-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-5">
            <h2 className="text-xl font-black text-ink-900 dark:text-ink-100 mb-1">Our Location</h2>
            <p className="text-sm text-ink-500 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              Sheikh Zayed Road, Dubai, United Arab Emirates
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden border border-ink-100 dark:border-ink-800 shadow-sm">
            <iframe
              title="Auto to Rental — Sheikh Zayed Road, Dubai"
              src="https://maps.google.com/maps?q=Auto+to+Rental+Sheikh+Zayed+Road+Dubai+UAE&z=15&output=embed"
              width="100%" height="420" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              style={{ border: 0 }} allowFullScreen />
          </div>
          <a
            href="https://www.google.com/maps/search/?api=1&query=Auto+to+Rental+Sheikh+Zayed+Road+Dubai+UAE"
            target="_blank" rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 hover:underline">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            Get Directions on Google Maps
          </a>
        </div>
      </section>
    </>
  )
}

"use client"

import { useId, useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { localizedPath, type Locale } from "../lib/locales"
import { t } from "../lib/i18n"

type FaqItem = {
  q: string
  a: string
}

export default function HomeFaqSection({ faqs, locale = "en", title, subtitle }: { faqs: FaqItem[]; locale?: Locale; title?: string; subtitle?: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const sectionId = useId()

  return (
    <section className="py-16 bg-white dark:bg-ink-950 border-t border-ink-100 dark:border-ink-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-10 md:mb-12">
          <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700 dark:border-brand-900 dark:bg-brand-900/30 dark:text-brand-300">
            FAQ
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl font-black tracking-tight text-ink-900 dark:text-ink-50">
            {title ?? t(locale, "faq_heading")}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm md:text-base leading-relaxed text-ink-600 dark:text-ink-300">
            {subtitle ?? t(locale, "faq_sub")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {faqs.map((f, i) => {
            const panelId = `${sectionId}-panel-${i}`
            const buttonId = `${sectionId}-button-${i}`
            const isOpen = openIndex === i

            return (
              <article
                key={i}
                className="group rounded-2xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-4 py-4 sm:px-5 shadow-sm transition-all duration-200 hover:border-brand-300 hover:shadow-md dark:border-ink-800 dark:bg-ink-900 dark:hover:border-brand-700"
              >
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex((prev) => (prev === i ? null : i))}
                    className="flex w-full items-start justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-ink-900 rounded-lg"
                  >
                    <span className="pr-1 text-[15px] sm:text-base font-bold leading-6 text-ink-900 dark:text-ink-100">
                      {f.q}
                    </span>
                    <span
                      className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink-200 dark:border-ink-700 text-ink-500 transition-all duration-300 dark:border-ink-700 dark:text-ink-300 ${
                        isOpen ? "rotate-180 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300" : "bg-white dark:bg-ink-900"
                      }`}
                      aria-hidden="true"
                    >
                      <ChevronDown size={16} />
                    </span>
                  </button>
                </h3>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                    isOpen ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <p className="min-h-0 overflow-hidden text-sm leading-7 text-ink-700 dark:text-ink-300">
                    {f.a}
                  </p>
                </div>
              </article>
            )
          })}
        </div>

        <div className="mt-10 text-center">
          <Link
            href={localizedPath("/help", locale)}
            className="inline-flex items-center rounded-full border border-transparent px-4 py-2 text-sm font-semibold text-brand-600 transition hover:text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:text-brand-300 dark:hover:bg-brand-900/30"
          >
            {t(locale, "faq_more")}
          </Link>
        </div>
      </div>
    </section>
  )
}

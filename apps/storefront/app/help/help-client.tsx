"use client"
import { useState } from "react"
import Link from "next/link"
import { ChevronDown, Search, MessageCircle, Phone, Mail } from "lucide-react"
import { SUPPORT_PHONE_TEL, SUPPORT_PHONE_WA_URL } from "@/lib/site-contact"
import type { HelpContent } from "@/lib/static-i18n-2"

export default function HelpClient({ c, homeHref, contactHref }: { c: HelpContent; homeHref: string; contactHref: string }) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState<string>("")

  const filtered = c.groups.map(g => ({
    ...g,
    items: g.items.filter(i => !query || i.q.toLowerCase().includes(query.toLowerCase()) || i.a.toLowerCase().includes(query.toLowerCase())),
  })).filter(g => g.items.length > 0)

  return (
    <>
      <section className="bg-gradient-to-br from-brand-600 to-brand-900 text-white py-14">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <div className="text-xs text-brand-200 mb-3"><Link href={homeHref} className="hover:text-white">{c.bcHome}</Link> › {c.bcHelp}</div>
          <h1 className="text-4xl md:text-5xl font-black">{c.h1}</h1>
          <p className="mt-3 text-brand-100 text-lg">{c.heroSub}</p>
          <div className="mt-6 relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" size={18}/>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder={c.searchPlaceholder} className="w-full pl-12 pr-4 py-3.5 rounded-xl text-ink-900 dark:text-ink-100 bg-white dark:bg-ink-900 shadow-lg focus:outline-none"/>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-3xl px-4 space-y-10">
          {filtered.length === 0 && (
            <div className="text-center text-ink-500 py-12">
              {c.noMatchPre}"<strong>{query}</strong>"{c.noMatchPost}<Link href={contactHref} className="text-brand-600 hover:underline">{c.contactLink}</Link>.
            </div>
          )}
          {filtered.map(group => (
            <div key={group.section}>
              <h2 className="text-xl font-bold text-ink-900 dark:text-ink-100 mb-4">{group.section}</h2>
              <div className="space-y-2">
                {group.items.map((it, idx) => {
                  const id = `${group.section}-${idx}`
                  const isOpen = open === id
                  return (
                    <div key={id} className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-xl overflow-hidden">
                      <button onClick={() => setOpen(isOpen ? "" : id)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-ink-50 dark:bg-ink-900/50">
                        <span className="font-semibold text-ink-900 dark:text-ink-100">{it.q}</span>
                        <ChevronDown size={18} className={`text-ink-400 transition-transform ${isOpen ? "rotate-180" : ""}`}/>
                      </button>
                      {isOpen && <div className="px-5 pb-5 text-ink-700 dark:text-ink-300 leading-relaxed text-sm border-t border-ink-100 dark:border-ink-800 pt-4">{it.a}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-14 bg-ink-50 dark:bg-ink-900/50">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100 mb-2">{c.stillTitle}</h2>
          <p className="text-ink-600 dark:text-ink-400 mb-6">{c.stillSub}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href={SUPPORT_PHONE_WA_URL} target="_blank" rel="noopener" className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-5 py-3 rounded-xl"><MessageCircle size={16}/>{c.whatsapp}</a>
            <a href={SUPPORT_PHONE_TEL} className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-5 py-3 rounded-xl"><Phone size={16}/>{c.call}</a>
            <a href="mailto:hello@autotorental.com" className="inline-flex items-center gap-2 border border-ink-200 dark:border-ink-700 hover:border-ink-400 text-ink-700 dark:text-ink-300 font-semibold px-5 py-3 rounded-xl"><Mail size={16}/>{c.email}</a>
          </div>
        </div>
      </section>
    </>
  )
}

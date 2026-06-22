"use client"
import { useState } from "react"
import Link from "next/link"
import { Mail, Phone, MessageCircle, MapPin, Send, CheckCircle } from "lucide-react"
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL, SUPPORT_PHONE_WA_URL } from "@/lib/site-contact"
import type { ContactContent } from "@/lib/static-i18n"

export default function ContactForm({ c, privacyHref }: { c: ContactContent; privacyHref: string }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!form.name || !form.email || !form.message) { setError(c.requiredError); return }
    setSending(true)
    try {
      const res = await fetch("https://api.autotorental.com/store/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-publishable-api-key": process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || "" },
        body: JSON.stringify(form),
      })
      if (res.ok) setSent(true)
      else setError(c.sendError)
    } catch { setError(c.sendError) }
    finally { setSending(false) }
  }

  return (
    <div className="lg:col-span-3 grid lg:grid-cols-3 gap-10">
      {/* Contact options sidebar */}
      <div className="space-y-4">
        <a href={SUPPORT_PHONE_WA_URL} target="_blank" rel="noopener" className="surface-card interactive-card flex items-center gap-4 p-5 bg-green-50">
          <div className="w-12 h-12 rounded-xl bg-green-500 text-white flex items-center justify-center"><MessageCircle size={22}/></div>
          <div>
            <div className="font-bold text-ink-900 dark:text-ink-100">{c.whatsapp}</div>
            <div className="text-sm text-green-700">{SUPPORT_PHONE_DISPLAY}</div>
            <div className="text-xs text-ink-500 mt-1">{c.whatsappNote}</div>
          </div>
        </a>

        <a href={SUPPORT_PHONE_TEL} className="surface-card interactive-card flex items-center gap-4 p-5 bg-brand-50">
          <div className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center"><Phone size={22}/></div>
          <div>
            <div className="font-bold text-ink-900 dark:text-ink-100">{c.phone}</div>
            <div className="text-sm text-brand-700">{SUPPORT_PHONE_DISPLAY}</div>
            <div className="text-xs text-ink-500 mt-1">{c.phoneNote}</div>
          </div>
        </a>

        <a href="mailto:hello@autotorental.com" className="surface-card interactive-card flex items-center gap-4 p-5 bg-ink-50 dark:bg-ink-900/50">
          <div className="w-12 h-12 rounded-xl bg-ink-800 text-white flex items-center justify-center"><Mail size={22}/></div>
          <div>
            <div className="font-bold text-ink-900 dark:text-ink-100">{c.email}</div>
            <div className="text-sm text-ink-700 dark:text-ink-300">hello@autotorental.com</div>
            <div className="text-xs text-ink-500 mt-1">{c.emailNote}</div>
          </div>
        </a>

        <div className="surface-card p-5 bg-ink-50 dark:bg-ink-900/50">
          <div className="flex items-center gap-3 mb-2">
            <MapPin size={18} className="text-brand-600"/>
            <div className="font-bold text-ink-900 dark:text-ink-100">{c.hqTitle}</div>
          </div>
          <div className="text-sm text-ink-600 dark:text-ink-400 leading-relaxed">
            {c.hqLine1}<br/>
            {c.hqLine2}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="lg:col-span-2">
        <div className="surface-card p-6 md:p-8">
          {sent ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4"><CheckCircle size={32}/></div>
              <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100">{c.sentTitle}</h2>
              <p className="text-ink-600 dark:text-ink-400 mt-2">{c.sentBodyPre}<strong>{form.email}</strong>{c.sentBodyPost}</p>
              <button onClick={() => { setSent(false); setForm({ name: "", email: "", phone: "", subject: "", message: "" }) }} className="mt-6 btn-outline">{c.sendAnother}</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100 mb-4">{c.formHeading}</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-ink-500">{c.labelName}</label>
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full mt-1 border border-ink-200 dark:border-ink-700 rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"/>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-ink-500">{c.labelEmail}</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full mt-1 border border-ink-200 dark:border-ink-700 rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"/>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-ink-500">{c.labelPhone}</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full mt-1 border border-ink-200 dark:border-ink-700 rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"/>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-ink-500">{c.labelSubject}</label>
                  <select value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className="w-full mt-1 border border-ink-200 dark:border-ink-700 rounded-lg px-3 py-2.5 bg-white dark:bg-ink-900 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100">
                    <option value="">{c.selectPlaceholder}</option>
                    {c.subjects.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-ink-500">{c.labelMessage}</label>
                <textarea rows={6} value={form.message} onChange={e => setForm({...form, message: e.target.value})} className="w-full mt-1 border border-ink-200 dark:border-ink-700 rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"/>
              </div>
              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{error}</div>}
              <button type="submit" disabled={sending} className="btn-primary inline-flex items-center gap-2"><Send size={16}/>{sending ? c.sendingBtn : c.sendBtn}</button>
              <p className="text-xs text-ink-500">{c.privacyPre}<Link href={privacyHref} className="text-brand-600 hover:underline">{c.privacyLink}</Link>{c.privacyPost}</p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

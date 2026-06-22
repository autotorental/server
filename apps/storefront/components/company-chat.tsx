"use client"
import { useEffect, useRef, useState } from "react"
import { MessageSquare, X, Send } from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.autotorental.com"
const KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

type Msg = { id: number; sender: string; name?: string; text: string; created_at: string }

// First-party chat between a visitor and a specific rental company (vendor).
// Vendor answers from their dashboard → Messages. No third party.
export default function CompanyChat({ sellerId, sellerName }: { sellerId: string; sellerName?: string }) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState("")
  const lastId = useRef(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const headers = { "Content-Type": "application/json", "x-publishable-api-key": KEY }

  const sid = () => {
    try {
      const k = `atr_vchat_${sellerId}`
      let s = localStorage.getItem(k)
      if (!s) { s = "v" + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(k, s) }
      return s
    } catch { return "anon_" + sellerId }
  }

  const poll = async () => {
    try {
      const r = await fetch(`${API}/store/support-chat?session_id=${sid()}&after=${lastId.current}`, { headers })
      if (!r.ok) return
      const d = await r.json()
      const arr: Msg[] = d.messages || []
      if (arr.length) { lastId.current = arr[arr.length - 1].id; setMsgs((p) => [...p, ...arr]) }
    } catch { /* ignore */ }
  }

  useEffect(() => { if (!open) return; poll(); const iv = setInterval(poll, 4000); return () => clearInterval(iv) }, [open])
  useEffect(() => { boxRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }) }, [msgs])

  const send = async () => {
    const t = text.trim()
    if (!t) return
    setText("")
    try {
      const r = await fetch(`${API}/store/support-chat`, { method: "POST", headers, body: JSON.stringify({ session_id: sid(), text: t, seller_id: sellerId }) })
      if (r.ok) { const d = await r.json(); if (d.message) { lastId.current = d.message.id; setMsgs((p) => [...p, d.message]) } }
    } catch { /* ignore */ }
  }

  return (
    <>
      {/* Message button — full-width when in grid */}
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/30 dark:hover:bg-brand-900/50 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 font-bold py-3 px-4 rounded-xl transition">
        <MessageSquare size={16} /> Message
      </button>

      {/* Chat panel — anchored at bottom of viewport, full-width on mobile */}
      {open && (
        <>
          {/* Backdrop on mobile */}
          <div className="fixed inset-0 z-[59] bg-black/30 md:hidden" onClick={() => setOpen(false)} />
          <div className="fixed z-[60] flex flex-col overflow-hidden rounded-t-2xl md:rounded-2xl shadow-2xl border border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900
            bottom-0 left-0 right-0 h-[72vh]
            md:bottom-5 md:right-5 md:left-auto md:w-[360px] md:h-[520px]">
            {/* Header */}
            <div className="bg-brand-600 text-white px-4 py-3.5 flex items-center justify-between shrink-0">
              <div>
                <div className="font-bold text-sm">{sellerName || "Rental company"}</div>
                <div className="text-[11px] opacity-80">Replies from their dashboard</div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition"><X size={18} /></button>
            </div>

            {/* Messages */}
            <div ref={boxRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-ink-50 dark:bg-ink-950/40">
              {msgs.length === 0 && (
                <div className="text-center text-ink-400 text-sm mt-8 px-4">
                  <MessageSquare size={32} className="mx-auto mb-3 opacity-30"/>
                  <p>Send a message to <strong className="text-ink-700 dark:text-ink-300">{sellerName || "this company"}</strong> about their cars.</p>
                </div>
              )}
              {msgs.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "visitor" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-snug ${m.sender === "visitor" ? "bg-brand-600 text-white rounded-br-sm" : "bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100 rounded-bl-sm border border-ink-100 dark:border-ink-700"}`}>{m.text}</div>
                </div>
              ))}
            </div>

            {/* Composer */}
            <div className="p-3 border-t border-ink-100 dark:border-ink-800 flex items-center gap-2 shrink-0 bg-white dark:bg-ink-900">
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send() }}
                placeholder="Type a message…"
                className="flex-1 rounded-full border border-ink-200 dark:border-ink-700 bg-ink-50 dark:bg-ink-800 px-4 py-2.5 text-sm text-ink-900 dark:text-ink-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
              <button onClick={send} disabled={!text.trim()} className="w-10 h-10 rounded-full bg-brand-600 disabled:opacity-40 text-white flex items-center justify-center hover:bg-brand-700 transition shrink-0">
                <Send size={17} />
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

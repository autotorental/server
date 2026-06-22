"use client"
import { useEffect, useRef, useState } from "react"
import { MessageCircle, X, Send } from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.autotorental.com"
const KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

type Msg = { id: number; sender: string; name?: string; text: string; created_at: string }

function sid(): string {
  try {
    let s = localStorage.getItem("atr_chat_sid")
    if (!s) { s = "c" + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("atr_chat_sid", s) }
    return s
  } catch { return "anon" }
}

// First-party live chat widget — talks to OUR backend (/store/support-chat),
// answered from the admin dashboard. No third party.
export default function LiveChat() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState("")
  const lastId = useRef(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const headers = { "Content-Type": "application/json", "x-publishable-api-key": KEY }

  const poll = async () => {
    try {
      const r = await fetch(`${API}/store/support-chat?session_id=${sid()}&after=${lastId.current}`, { headers })
      if (!r.ok) return
      const d = await r.json()
      const arr: Msg[] = d.messages || []
      if (arr.length) {
        lastId.current = arr[arr.length - 1].id
        setMsgs((prev) => [...prev, ...arr])
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!open) return
    poll()
    const iv = setInterval(poll, 4000)
    return () => clearInterval(iv)
  }, [open])

  useEffect(() => { boxRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }) }, [msgs])

  const send = async () => {
    const t = text.trim()
    if (!t) return
    setText("")
    try {
      const r = await fetch(`${API}/store/support-chat`, { method: "POST", headers, body: JSON.stringify({ session_id: sid(), text: t }) })
      if (r.ok) { const d = await r.json(); if (d.message) { lastId.current = d.message.id; setMsgs((p) => [...p, d.message]) } }
    } catch { /* ignore */ }
  }

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="Live chat"
          className="live-chat-bubble fixed bottom-20 right-4 z-50 lg:bottom-5 lg:right-5 w-14 h-14 rounded-full bg-brand-600 text-white shadow-lg flex items-center justify-center hover:bg-brand-700 transition">
          <MessageCircle size={26} />
        </button>
      )}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[92vw] max-w-sm h-[60vh] max-h-[520px] rounded-2xl bg-white dark:bg-ink-900 shadow-2xl border border-ink-100 dark:border-ink-800 flex flex-col overflow-hidden">
          <div className="bg-brand-600 text-white px-4 py-3 flex items-center justify-between">
            <div><div className="font-bold text-sm">Auto to Rental — Support</div><div className="text-[11px] opacity-90">We usually reply within minutes</div></div>
            <button onClick={() => setOpen(false)} aria-label="Close"><X size={20} /></button>
          </div>
          <div ref={boxRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-ink-50 dark:bg-ink-950/40">
            {msgs.length === 0 && <div className="text-center text-ink-400 text-sm mt-6">👋 Hi! How can we help you today?</div>}
            {msgs.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "visitor" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.sender === "visitor" ? "bg-brand-600 text-white rounded-br-sm" : "bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100 rounded-bl-sm border border-ink-100 dark:border-ink-700"}`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-ink-100 dark:border-ink-800 flex items-center gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send() }}
              placeholder="Type a message…" className="flex-1 rounded-full border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-4 py-2 text-sm text-ink-900 dark:text-ink-100 outline-none focus:border-brand-500" />
            <button onClick={send} className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700"><Send size={18} /></button>
          </div>
        </div>
      )}
    </>
  )
}

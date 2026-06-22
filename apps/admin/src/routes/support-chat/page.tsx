import { useEffect, useRef, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Badge } from "@medusajs/ui"
import { ChatBubbleLeftRight } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("Live Chat", "الدردشة المباشرة"), icon: ChatBubbleLeftRight, rank: 41 }

type Convo = { session_id: string; name?: string; country?: string; last_text: string; last_sender: string; last_at: string; unread: number; seller_id?: string | null; seller_name?: string | null; scope?: "vendor" | "support" }
type Msg   = { id: number; sender: string; name?: string; text: string; created_at: string }
type Status = "online" | "away" | "busy" | "offline"
type IntgStatus = {
  first_party: { active: boolean; conversations: number; messages: number; today: number; unread: number }
  connectycube: { configured: boolean; app_id: string; ok: boolean }
  dashboard_url: string
}

const STATUS_OPTIONS: { value: Status; label: string; color: string; dot: string }[] = [
  { value: "online",  label: "Online",  color: "text-emerald-600 bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  { value: "away",    label: "Away",    color: "text-amber-600  bg-amber-50  border-amber-200",  dot: "bg-amber-400"  },
  { value: "busy",    label: "Busy",    color: "text-red-600    bg-red-50    border-red-200",    dot: "bg-red-500"    },
  { value: "offline", label: "Offline", color: "text-ui-fg-subtle bg-ui-bg-subtle border-ui-border-base", dot: "bg-ui-fg-muted" },
]

const ago = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s`; if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`
}

const Page = () => {
  const [convos, setConvos]   = useState<Convo[]>([])
  const [active, setActive]   = useState<string | null>(null)
  const [msgs, setMsgs]       = useState<Msg[]>([])
  const [text, setText]       = useState("")
  const [status, setStatus]   = useState<Status>("online")
  const [statusOpen, setStatusOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [intg, setIntg]       = useState<IntgStatus | null>(null)
  const [intgOpen, setIntgOpen] = useState(false)
  const boxRef  = useRef<HTMLDivElement>(null)
  const taRef   = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch(`${API}/admin/chat-integration`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null).then(d => d && setIntg(d)).catch(() => {})
  }, [])

  const activeConvo = convos.find(c => c.session_id === active)
  const curStatus = STATUS_OPTIONS.find(s => s.value === status)!

  const loadConvos = () => {
    fetch(`${API}/admin/support-chat`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setConvos(d?.conversations || []))
      .catch(() => {})
  }
  const loadMsgs = (sid: string) => {
    fetch(`${API}/admin/support-chat/${sid}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setMsgs(d?.messages || []))
      .catch(() => {})
  }

  useEffect(() => { loadConvos(); const t = setInterval(loadConvos, 6000); return () => clearInterval(t) }, [])
  useEffect(() => {
    if (!active) return
    loadMsgs(active)
    const t = setInterval(() => loadMsgs(active), 4000)
    return () => clearInterval(t)
  }, [active])
  useEffect(() => { boxRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }) }, [msgs])

  // Auto-resize textarea
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    const ta = taRef.current
    if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 160) + "px" }
  }

  const send = async () => {
    const t = text.trim()
    if (!t || !active || sending) return
    setSending(true); setText("")
    if (taRef.current) taRef.current.style.height = "44px"
    await fetch(`${API}/admin/support-chat/${active}`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: t }),
    }).catch(() => {})
    loadMsgs(active); loadConvos(); setSending(false)
    taRef.current?.focus()
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() }
  }

  const totalUnread = convos.reduce((s, c) => s + (c.unread || 0), 0)

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* ── TOP BAR ── */}
      <div className="px-5 py-3 border-b border-ui-border-base bg-ui-bg-base flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-ui-fg-base flex items-center justify-center shrink-0">
            <ChatBubbleLeftRight size={16} className="text-ui-bg-base"/>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Text className="font-semibold text-sm text-ui-fg-base">Live Chat</Text>
              {totalUnread > 0 && <Badge color="red" size="small">{totalUnread} new</Badge>}
            </div>
            <Text size="xsmall" className="text-ui-fg-subtle">First-party · No third party</Text>
          </div>
        </div>

        <div className="flex items-center gap-2">
        {/* Integration status */}
        <div className="relative">
          <button
            onClick={() => setIntgOpen(x => !x)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-ui-border-base bg-ui-bg-subtle text-xs font-semibold text-ui-fg-subtle hover:bg-ui-bg-base-hover transition"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${intg?.connectycube?.ok ? "bg-emerald-500" : "bg-ui-fg-muted"}`}/>
            {tt("Integration", "التكامل")}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          {intgOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-ui-bg-base border border-ui-border-base rounded-xl shadow-elevation-flyout overflow-hidden w-80 p-4">
              <Text className="font-semibold text-sm text-ui-fg-base mb-1">{tt("Chat engine", "محرّك الدردشة")}</Text>
              {/* First-party */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 mb-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"/>
                  <Text className="font-semibold text-xs text-emerald-700">{tt("First-party chat — Active", "دردشة خاصة بك — مفعّلة")}</Text>
                </div>
                <Text size="xsmall" className="text-ui-fg-subtle mb-2">{tt("Your data, on your servers. Visible here, in the vendor app and the buyer app.", "بياناتك على خوادمك. تظهر هنا وفي تطبيق البائع وتطبيق المشتري.")}</Text>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center"><div className="text-base font-bold text-ui-fg-base">{intg?.first_party?.conversations ?? 0}</div><div className="text-[10px] text-ui-fg-muted">{tt("Conversations", "محادثات")}</div></div>
                  <div className="text-center"><div className="text-base font-bold text-ui-fg-base">{intg?.first_party?.messages ?? 0}</div><div className="text-[10px] text-ui-fg-muted">{tt("Messages", "رسائل")}</div></div>
                  <div className="text-center"><div className="text-base font-bold text-ui-fg-base">{intg?.first_party?.today ?? 0}</div><div className="text-[10px] text-ui-fg-muted">{tt("Today", "اليوم")}</div></div>
                </div>
              </div>
              {/* ConnectyCube */}
              <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`w-2 h-2 rounded-full ${intg?.connectycube?.ok ? "bg-emerald-500" : "bg-ui-fg-muted"}`}/>
                  <Text className="font-semibold text-xs text-ui-fg-base">ConnectyCube — {intg?.connectycube?.ok ? tt("Connected", "متصل") : (intg?.connectycube?.configured ? tt("Configured", "مهيّأ") : tt("Not set", "غير مهيّأ"))}</Text>
                </div>
                <Text size="xsmall" className="text-ui-fg-subtle mb-2">{tt("Backend wired (App ID ", "مربوط بالخادم (App ID ")}{intg?.connectycube?.app_id || "—"}{tt("). Enables native push & file sharing in the mobile app.", "). يفعّل الإشعارات الفورية ومشاركة الملفات في تطبيق الجوال.")}</Text>
                <a href={intg?.dashboard_url || "https://admin.connectycube.com"} target="_blank" rel="noreferrer">
                  <Button size="small" variant="secondary" className="w-full">{tt("Open ConnectyCube dashboard", "فتح لوحة ConnectyCube")}</Button>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Status selector */}
        <div className="relative">
          <button
            onClick={() => setStatusOpen(x => !x)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${curStatus.color}`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${curStatus.dot} ${status === "online" ? "animate-pulse" : ""}`}/>
            {curStatus.label}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          {statusOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-ui-bg-base border border-ui-border-base rounded-xl shadow-elevation-flyout overflow-hidden w-36">
              {STATUS_OPTIONS.map(s => (
                <button key={s.value} onClick={() => { setStatus(s.value); setStatusOpen(false) }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium hover:bg-ui-bg-base-hover transition ${status === s.value ? "bg-ui-bg-base-hover" : ""}`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`}/>
                  <span className="text-ui-fg-base">{s.label}</span>
                  {status === s.value && <svg className="ml-auto" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                </button>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR: Conversations ── */}
        <div className="w-72 shrink-0 border-r border-ui-border-base overflow-y-auto bg-ui-bg-base flex flex-col">
          {convos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-ui-bg-subtle flex items-center justify-center mb-3">
                <ChatBubbleLeftRight size={20} className="text-ui-fg-muted"/>
              </div>
              <Text className="text-ui-fg-muted text-sm">No chats yet</Text>
              <Text size="xsmall" className="text-ui-fg-subtle mt-1">Chats appear when visitors message from the site or app</Text>
            </div>
          ) : convos.map((c) => (
            <button key={c.session_id} onClick={() => setActive(c.session_id)}
              className={`w-full text-left px-4 py-3.5 border-b border-ui-border-base transition ${
                active === c.session_id
                  ? "bg-ui-bg-base-hover border-l-2 border-l-ui-fg-interactive"
                  : "hover:bg-ui-bg-base-hover border-l-2 border-l-transparent"
              }`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-ui-bg-subtle border border-ui-border-base flex items-center justify-center shrink-0 text-xs font-bold text-ui-fg-muted">
                    {(c.name || "V")[0].toUpperCase()}
                  </div>
                  <span className="font-medium text-sm truncate text-ui-fg-base">
                    {c.name || `Visitor ···${c.session_id.slice(-4)}`}
                  </span>
                </div>
                {c.unread > 0
                  ? <Badge size="2xsmall" color="red">{c.unread}</Badge>
                  : <span className="text-[10px] text-ui-fg-muted shrink-0">{ago(c.last_at)}</span>
                }
              </div>
              <div className="pl-9 mt-1">
                {c.scope === "vendor"
                  ? <Badge size="2xsmall" color="blue">{c.seller_name || "Vendor"}</Badge>
                  : <Badge size="2xsmall" color="grey">Platform support</Badge>}
              </div>
              <p className="text-xs text-ui-fg-muted truncate mt-1 pl-9">
                {c.last_sender === "agent" ? <span className="text-ui-fg-subtle">You: </span> : ""}{c.last_text}
              </p>
              {c.country && <p className="text-[10px] text-ui-fg-muted mt-0.5 pl-9">{c.country}</p>}
            </button>
          ))}
        </div>

        {/* ── THREAD ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-ui-bg-subtle">
          {!active ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-ui-bg-base border border-ui-border-base flex items-center justify-center">
                <ChatBubbleLeftRight size={28} className="text-ui-fg-muted"/>
              </div>
              <Text className="text-ui-fg-muted">Select a conversation to reply</Text>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-5 py-3 border-b border-ui-border-base bg-ui-bg-base flex items-center gap-3 shrink-0">
                <div className="w-8 h-8 rounded-full bg-ui-fg-interactive/10 border border-ui-border-base flex items-center justify-center text-sm font-bold text-ui-fg-interactive">
                  {(activeConvo?.name || "V")[0].toUpperCase()}
                </div>
                <div>
                  <Text className="font-semibold text-sm">{activeConvo?.name || `Visitor ···${active.slice(-4)}`}</Text>
                  <div className="flex items-center gap-2">
                    {activeConvo?.scope === "vendor"
                      ? <Badge size="2xsmall" color="blue">{activeConvo?.seller_name || "Vendor"}</Badge>
                      : <Badge size="2xsmall" color="grey">Platform support</Badge>}
                    {activeConvo?.country && <Text size="xsmall" className="text-ui-fg-muted">{activeConvo.country}</Text>}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div ref={boxRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {msgs.map((m) => (
                  <div key={m.id} className={`flex gap-2 ${m.sender === "agent" ? "justify-end" : "justify-start"}`}>
                    {m.sender !== "agent" && (
                      <div className="w-7 h-7 rounded-full bg-ui-bg-base border border-ui-border-base flex items-center justify-center text-xs font-bold text-ui-fg-muted shrink-0 mt-0.5">
                        {(m.name || "V")[0].toUpperCase()}
                      </div>
                    )}
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      m.sender === "agent"
                        ? "bg-ui-fg-base text-ui-bg-base rounded-br-sm"
                        : "bg-ui-bg-base border border-ui-border-base text-ui-fg-base rounded-bl-sm"
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── INPUT AREA (full width, auto-resize) ── */}
              <div className="shrink-0 border-t border-ui-border-base bg-ui-bg-base px-4 py-3">
                {status !== "online" && (
                  <div className={`mb-2 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                    status === "away" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                    status === "busy" ? "bg-red-50 text-red-700 border border-red-200" :
                    "bg-gray-50 text-gray-600 border border-gray-200"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${curStatus.dot}`}/>
                    You are {curStatus.label.toLowerCase()} — visitors see this status
                  </div>
                )}
                <div className="flex gap-3 items-end">
                  <div className="flex-1 relative">
                    <textarea
                      ref={taRef}
                      value={text}
                      onChange={handleTextChange}
                      onKeyDown={handleKey}
                      disabled={sending}
                      placeholder="Type your reply… (Enter to send, Shift+Enter for new line)"
                      rows={1}
                      style={{ height: 44, minHeight: 44, maxHeight: 160, resize: "none" }}
                      className="w-full rounded-xl border border-ui-border-base bg-ui-bg-field px-4 py-2.5 text-sm text-ui-fg-base placeholder:text-ui-fg-muted outline-none focus:border-ui-fg-interactive focus:ring-1 focus:ring-ui-fg-interactive/20 transition overflow-y-auto disabled:opacity-60"
                    />
                  </div>
                  <Button
                    onClick={send}
                    disabled={!text.trim() || sending}
                    className="shrink-0 h-11"
                  >
                    {sending ? "Sending…" : "Send"}
                  </Button>
                </div>
                <Text size="xsmall" className="text-ui-fg-muted mt-1.5 pl-1">
                  Enter to send · Shift+Enter for new line
                </Text>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Page

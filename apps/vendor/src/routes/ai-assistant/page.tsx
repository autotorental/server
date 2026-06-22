import { useCallback, useEffect, useRef, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Heading, Text, Badge } from "@medusajs/ui"
import { Sparkles } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: "AI Assistant", icon: Sparkles, rank: 0 }

type Msg = {
  role: "user" | "assistant"
  content: string
  tools?: string[]
  pdf_url?: string
}

const SUGGESTIONS = [
  { label: "📊 Views this week", msg: "How many views did my cars get this week? Show me a breakdown by car." },
  { label: "👥 Who visits?", msg: "Who visits my cars? Tell me about the demographics — men/women, age groups, countries." },
  { label: "📄 PDF catalog", msg: "Generate a beautiful PDF catalog for all my cars." },
  { label: "🏆 Best performers", msg: "Which of my cars brings the most views and contacts? Make a ranked report." },
  { label: "📞 Contacts this month", msg: "Show me all contact events for my company this month." },
  { label: "📱 Mobile vs Desktop", msg: "How many visitors come from mobile vs desktop? Any insights?" },
  { label: "💡 Improve listings", msg: "Which cars have low performance and how can I improve them?" },
  { label: "💰 Pricing advice", msg: "Based on my fleet and market data, what pricing adjustments do you recommend?" },
  { label: "📈 Monthly report", msg: "Generate a professional monthly performance report for my rental company." },
]

function MarkdownText({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {text.split("\n").map((line, i) => {
        if (line.startsWith("### ")) return <h3 key={i} className="font-bold text-sm mt-3 text-ui-fg-base">{line.slice(4)}</h3>
        if (line.startsWith("## "))  return <h2 key={i} className="font-bold text-base mt-3 text-ui-fg-base">{line.slice(3)}</h2>
        if (line.startsWith("# "))   return <h1 key={i} className="font-bold text-lg mt-2 text-ui-fg-base">{line.slice(2)}</h1>
        if (line.startsWith("- ") || line.startsWith("• "))
          return <div key={i} className="flex gap-2"><span className="shrink-0 text-ui-fg-muted mt-0.5">•</span><span>{renderInline(line.slice(2))}</span></div>
        if (line.match(/^\d+\. /))
          return <div key={i} className="flex gap-2"><span className="shrink-0 text-ui-fg-muted">{line.match(/^\d+/)?.[0]}.</span><span>{renderInline(line.replace(/^\d+\. /,""))}</span></div>
        if (line.startsWith("| "))
          return <div key={i} className="font-mono text-xs bg-ui-bg-subtle rounded px-2 py-0.5 overflow-x-auto whitespace-pre">{line}</div>
        if (!line.trim()) return <div key={i} className="h-1"/>
        return <p key={i}>{renderInline(line)}</p>
      })}
    </div>
  )
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="font-semibold text-ui-fg-base">{p.slice(2,-2)}</strong>
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="bg-ui-bg-subtle px-1.5 py-0.5 rounded text-xs font-mono text-ui-fg-base">{p.slice(1,-1)}</code>
    return p
  })
}

const TOOL_LABELS: Record<string, string> = {
  run_query: "📊 Queried your database",
  get_analytics: "📈 Fetched analytics",
  generate_pdf: "📄 Generated PDF",
  generate_report: "📋 Built report",
}

export default function VendorAIPage() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [memLoaded, setMemLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch(`${API}/vendor/ai/chat`, { credentials: "include" })
      .then(r => r.ok ? r.json() : { messages: [] })
      .then(d => {
        const mem: Msg[] = (d.messages || []).slice(-30)
        if (mem.length > 0) setMsgs(mem)
        else setMsgs([{
          role: "assistant",
          content: "مرحباً! أنا **مساعدك التجاري الذكي** 🤖\n\nأستطيع الوصول إلى بيانات شركتك الحقيقية — سياراتك، المشاهدات، التواصل، وتقارير الأداء.\n\nاسألني أي شيء مثل:\n- *\"كم مشاهدة حصلت عليها سياراتي هذا الأسبوع؟\"*\n- *\"أنشئ لي كاتالوج PDF لسيارات SUV\"*\n- *\"من يزور متجري؟ رجال أم نساء؟\"*\n- *\"أي سيارة تجلب أكثر تواصل؟\"*\n\nأتذكر محادثاتنا السابقة. بماذا تريد أن تبدأ؟",
        }])
        setMemLoaded(true)
      })
      .catch(() => setMemLoaded(true))
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [msgs])

  const send = useCallback(async (text?: string) => {
    const q = (text || input).trim()
    if (!q || loading) return
    setInput("")

    const thinking: Msg = { role: "assistant", content: "__thinking__" }
    setMsgs(prev => [...prev, { role: "user", content: q }, thinking])
    setLoading(true)

    try {
      const r = await fetch(`${API}/vendor/ai/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      })
      const d = await r.json()
      const reply = d.reply || (d.message ? `❌ ${d.message}` : "لا يوجد رد")
      setMsgs(prev => prev.map((m, i) => i === prev.length - 1
        ? { role: "assistant", content: reply, tools: d.tools_used, pdf_url: d.pdf_url }
        : m
      ))
    } catch (e: any) {
      setMsgs(prev => prev.map((m, i) => i === prev.length - 1
        ? { role: "assistant", content: "❌ خطأ: " + (e?.message || "فشل الاتصال") }
        : m
      ))
    } finally { setLoading(false) }
  }, [input, loading])

  const clearMemory = async () => {
    await fetch(`${API}/vendor/ai/chat`, { method: "POST", credentials: "include", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ message: "Hello", reset: true }) })
    setMsgs([{ role: "assistant", content: "تم مسح الذاكرة! نبدأ من جديد." }])
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="px-5 py-3 border-b border-ui-border-base bg-ui-bg-base flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{background:"linear-gradient(135deg,#6366f1,#a855f7)"}}>
          <Sparkles className="text-white"/>
        </div>
        <div className="flex-1 min-w-0">
          <Heading level="h2" className="text-sm font-bold">AI Business Assistant</Heading>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
              <Text size="xsmall" className="text-ui-fg-subtle">Auto to Rental AI · Private</Text>
            </div>
            <Badge color="purple" size="small">Knows your business</Badge>
            <Badge color="green" size="small">Memory enabled</Badge>
          </div>
        </div>
        <button onClick={clearMemory} className="text-xs text-ui-fg-muted hover:text-ui-fg-base px-2.5 py-1.5 rounded-lg border border-ui-border-base hover:bg-ui-bg-base-hover transition shrink-0">
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!memLoaded && <div className="text-center py-10"><Text className="text-ui-fg-muted">Loading AI assistant…</Text></div>}

        {msgs.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center mt-0.5" style={{background:"linear-gradient(135deg,#6366f1,#a855f7)"}}>
                <Sparkles size={14} className="text-white"/>
              </div>
            )}
            <div className="max-w-[85%]">
              {/* Tool badges */}
              {msg.tools && msg.tools.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {msg.tools.map((t, ti) => (
                    <Badge key={ti} color="orange" size="small">{TOOL_LABELS[t] || `🔧 ${t}`}</Badge>
                  ))}
                </div>
              )}

              <div className={`rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-ui-fg-base text-ui-bg-base rounded-tr-sm text-sm"
                  : "bg-ui-bg-component border border-ui-border-base rounded-tl-sm text-ui-fg-base"
              }`}>
                {msg.content === "__thinking__" ? (
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex gap-1">
                      {[0,1,2].map(j => <div key={j} className="w-2 h-2 rounded-full bg-ui-fg-muted animate-bounce" style={{animationDelay:`${j*0.15}s`}}/>)}
                    </div>
                    <span className="text-xs text-ui-fg-muted">AI is thinking…</span>
                  </div>
                ) : msg.role === "assistant" ? (
                  <MarkdownText text={msg.content}/>
                ) : (
                  <span className="text-sm">{msg.content}</span>
                )}
              </div>

              {/* PDF Download button */}
              {msg.pdf_url && (
                <a
                  href={msg.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-800 text-sm font-semibold hover:from-purple-100 hover:to-indigo-100 transition w-fit"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5z"/>
                    <path d="M9.5 3V0L14 4.5h-3A1.5 1.5 0 0 1 9.5 3z"/>
                    <path fill="white" d="M4.603 14.087a.81.81 0 0 1-.438-.42c-.195-.388-.13-.776.07-1.076.165-.244.355-.472.552-.673l.609-.656a5.4 5.4 0 0 0 .11-.12c-.365-.014-.724-.064-1.061-.169a3.1 3.1 0 0 1-.906-.522 1.8 1.8 0 0 1-.508-.775c-.1-.315-.1-.67.004-.96.14-.373.44-.66.785-.83.333-.163.737-.26 1.223-.26H7.5v-.001a.5.5 0 0 1 .5.5v.001h.5a.5.5 0 0 1 0 1H8v1.5h.5a.5.5 0 0 1 0 1H8V13h.5a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5v-.001c0-.06.011-.12.034-.176z"/>
                  </svg>
                  📄 تنزيل PDF — اضغط هنا
                </a>
              )}
            </div>

            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-lg shrink-0 bg-ui-fg-base/10 border border-ui-border-base flex items-center justify-center text-xs font-bold mt-0.5">
                You
              </div>
            )}
          </div>
        ))}

        {/* Quick suggestions */}
        {msgs.length <= 1 && memLoaded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => send(s.msg)}
                className="text-left px-4 py-3 rounded-xl border border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-base-hover text-sm text-ui-fg-subtle hover:text-ui-fg-base transition">
                {s.label}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-ui-border-base bg-ui-bg-base shrink-0">
        <div className="flex gap-2 items-end rounded-2xl border border-ui-border-base bg-ui-bg-field p-2 focus-within:border-ui-fg-interactive focus-within:ring-1 focus-within:ring-ui-fg-interactive/30 transition">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading}
            placeholder="اسألني أي شيء عن أعمالك… (Enter للإرسال، Shift+Enter لسطر جديد)"
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-ui-fg-base placeholder:text-ui-fg-muted py-1.5 px-2 min-h-[38px] max-h-[120px] disabled:opacity-60"
            dir="auto"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition disabled:opacity-30"
            style={{background:"linear-gradient(135deg,#6366f1,#a855f7)"}}
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/>
              : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            }
          </button>
        </div>
        <Text size="xsmall" className="text-ui-fg-muted text-center mt-1.5">
          🧠 يتذكر بياناتك · Auto to Rental AI · ذكاء اصطناعي خاص
        </Text>
      </div>
    </div>
  )
}

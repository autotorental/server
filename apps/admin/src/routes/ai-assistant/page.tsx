import { useCallback, useEffect, useRef, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Heading, Text } from "@medusajs/ui"
import { Sparkles } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("AI Assistant", "المساعد الذكي"), icon: Sparkles, rank: 50 }

type Att  = { type: "image" | "video"; url: string; base64?: string; name: string }
type Msg  = { role: "user" | "assistant"; content: string; loading?: boolean; atts?: Att[]; model?: string }

type StepStatus = "pending" | "running" | "done" | "error"
type AgentStep = {
  step: number
  title: string
  model: string
  status: StepStatus
  result?: string
  expanded?: boolean
}

const SUGGESTIONS = [
  { en: "Check all pages & suggest improvements", ar: "افحص كل الصفحات واقترح تحسينات" },
  { en: "Write SEO for Lamborghini Urus listing",  ar: "اكتب SEO لسيارة لامبورغيني أوروس" },
  { en: "Best pricing strategy for luxury cars",   ar: "أفضل استراتيجية تسعير للسيارات الفاخرة" },
  { en: "How to get more customers?",              ar: "كيف أجلب عملاء أكثر؟" },
]

const STEP_LABELS = ["Planning", "Coding", "Deploying", "Reviewing"]

// ─── Markdown Renderer ───────────────────────────────────────────────────────

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }
  return (
    <div className="relative rounded-lg overflow-hidden my-2 border border-[#333]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#2d2d2d] border-b border-[#444]">
        <span className="text-[11px] text-[#999] font-mono">{lang || "code"}</span>
        <button onClick={copy} className="text-[11px] text-[#aaa] hover:text-white transition px-2 py-0.5 rounded bg-[#444] hover:bg-[#555]">
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="bg-[#1e1e1e] px-4 py-3 overflow-x-auto text-[12px] leading-[1.7] font-mono text-[#d4d4d4] whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function inl(t: string): React.ReactNode[] {
  return t.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="bg-[#2a2a2a] text-[#e06c75] px-1.5 py-0.5 rounded text-[11px] font-mono">{p.slice(1, -1)}</code>
    return p
  })
}

function MD({ text }: { text: string }) {
  const parts: React.ReactNode[] = []
  const lines = text.split("\n")
  let i = 0
  while (i < lines.length) {
    const ln = lines[i]
    // Code block
    if (ln.startsWith("```")) {
      const lang = ln.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      parts.push(<CodeBlock key={i} code={codeLines.join("\n")} lang={lang} />)
      i++
      continue
    }
    if (ln.startsWith("### ")) { parts.push(<h3 key={i} className="font-semibold text-sm mt-3 mb-1 text-ui-fg-base">{inl(ln.slice(4))}</h3>); i++; continue }
    if (ln.startsWith("## "))  { parts.push(<h2 key={i} className="font-semibold text-base mt-3 mb-1 text-ui-fg-base">{inl(ln.slice(3))}</h2>); i++; continue }
    if (ln.startsWith("# "))   { parts.push(<h1 key={i} className="font-bold text-lg mt-3 mb-1 text-ui-fg-base">{inl(ln.slice(2))}</h1>); i++; continue }
    if (ln.startsWith("- ") || ln.startsWith("• ")) {
      parts.push(<div key={i} className="flex gap-2 pl-1"><span className="text-ui-fg-muted mt-px shrink-0">–</span><span>{inl(ln.slice(2))}</span></div>)
      i++; continue
    }
    if (/^\d+\.\s/.test(ln)) {
      parts.push(<div key={i} className="flex gap-2 pl-1"><span className="text-ui-fg-muted shrink-0 tabular-nums">{ln.match(/^\d+/)?.[0]}.</span><span>{inl(ln.replace(/^\d+\.\s/, ""))}</span></div>)
      i++; continue
    }
    if (!ln.trim()) { parts.push(<div key={i} className="h-2" />); i++; continue }
    parts.push(<p key={i}>{inl(ln)}</p>)
    i++
  }
  return <div className="space-y-1 text-sm leading-[1.65]">{parts}</div>
}

// ─── Model Badge ─────────────────────────────────────────────────────────────

function ModelBadge({ model }: { model: string }) {
  let label = "Auto to Rental AI"
  let color = "bg-ui-bg-subtle text-ui-fg-muted border-ui-border-base"
  if (model.startsWith("claude-haiku")) { label = "Auto to Rental AI"; color = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800" }
  else if (model.startsWith("claude-sonnet")) { label = "Auto to Rental AI"; color = "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800" }
  else if (model.startsWith("claude-opus")) { label = "Auto to Rental AI"; color = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800" }
  else if (model.startsWith("qwen") || model.includes("coder")) { label = "Auto to Rental AI"; color = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800" }
  else if (model === "hermes3" || model.includes("hermes")) { label = "Auto to Rental AI"; color = "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-700" }
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${color}`}>
      <span className="w-1 h-1 rounded-full bg-current opacity-70 inline-block" />
      {label}
    </span>
  )
}

// ─── Step Status Icon ─────────────────────────────────────────────────────────

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "running") return (
    <div className="w-5 h-5 rounded-full border-2 border-ui-fg-interactive border-t-transparent animate-spin shrink-0" />
  )
  if (status === "done") return (
    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
      <svg width="10" height="10" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
  )
  if (status === "error") return (
    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0">
      <svg width="10" height="10" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </div>
  )
  return <div className="w-5 h-5 rounded-full border-2 border-ui-border-base bg-ui-bg-subtle shrink-0" />
}

// ─── Agent Panel ─────────────────────────────────────────────────────────────

function AgentPanel({
  task, setTask, password, setPassword, steps, summary, agentRunning, agentDone, agentError,
  onRun, onClose,
}: {
  task: string; setTask: (v: string) => void
  password: string; setPassword: (v: string) => void
  steps: AgentStep[]; summary: string
  agentRunning: boolean; agentDone: boolean; agentError: string
  onRun: () => void; onClose: () => void
}) {
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({})
  const toggle = (n: number) => setExpandedSteps(p => ({ ...p, [n]: !p[n] }))

  return (
    <div className="border-t border-ui-border-base bg-ui-bg-subtle p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🤖</span>
          <Heading level="h3" className="text-ui-fg-base text-sm font-semibold">Agent Task</Heading>
          <span className="text-xs text-ui-fg-muted">Multi-step AI execution</span>
        </div>
        <button onClick={onClose} className="text-ui-fg-muted hover:text-ui-fg-base transition text-lg leading-none">&times;</button>
      </div>

      {/* Input area (show only if not running/done) */}
      {!agentRunning && !agentDone && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ui-fg-base block mb-1">Task description</label>
            <textarea
              value={task}
              onChange={e => setTask(e.target.value)}
              rows={3}
              placeholder="E.g. Add a discount badge to vehicle cards on the home page"
              className="w-full rounded-lg border border-ui-border-base bg-ui-bg-field text-ui-fg-base text-sm px-3 py-2 resize-none outline-none focus:border-ui-fg-interactive"
            />
          </div>
          <button
            onClick={onRun}
            disabled={!task.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ui-fg-base text-ui-bg-base text-sm font-medium hover:opacity-80 transition disabled:opacity-40"
          >
            <span>🚀</span> Run Agent
          </button>
        </div>
      )}

      {/* Steps */}
      {(steps.length > 0 || agentRunning) && (
        <div className="space-y-2">
          {STEP_LABELS.map((label, idx) => {
            const stepNum = idx + 1
            const step = steps.find(s => s.step === stepNum)
            const status: StepStatus = step?.status || (agentRunning && steps.length < stepNum && steps.some(s => s.status === "running") ? "pending" : "pending")
            const isExpanded = expandedSteps[stepNum]
            return (
              <div key={stepNum} className={`rounded-xl border transition ${
                status === "running" ? "border-ui-fg-interactive bg-ui-bg-base shadow-sm" :
                status === "done"    ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20" :
                status === "error"   ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20" :
                "border-ui-border-base bg-ui-bg-base"
              }`}>
                <button
                  onClick={() => step?.result && toggle(stepNum)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <StepIcon status={status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-ui-fg-base">{step?.title || label}</span>
                      {step?.model && <ModelBadge model={step.model} />}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      status === "running" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" :
                      status === "done"    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" :
                      status === "error"   ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" :
                      "bg-ui-bg-subtle text-ui-fg-muted"
                    }`}>
                      {status === "running" ? "Running…" : status === "done" ? "Done" : status === "error" ? "Error" : "Pending"}
                    </span>
                    {step?.result && (
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className={`text-ui-fg-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    )}
                  </div>
                </button>
                {isExpanded && step?.result && (
                  <div className="px-4 pb-3 border-t border-ui-border-base">
                    <MD text={step.result} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Summary */}
      {agentDone && summary && (
        <div className="rounded-xl border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span>✅</span>
            <span className="font-semibold text-sm text-green-800 dark:text-green-300">Agent completed</span>
          </div>
          <MD text={summary} />
        </div>
      )}

      {/* Error */}
      {agentError && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20 p-3 text-sm text-red-700 dark:text-red-400">
          ❌ {agentError}
        </div>
      )}

      {/* Reset button after done/error */}
      {(agentDone || agentError) && (
        <button
          onClick={() => { setTask(""); setPassword(""); onClose() }}
          className="text-xs text-ui-fg-muted hover:text-ui-fg-base transition underline"
        >
          Close panel
        </button>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AIChat() {
  const [msgs, setMsgs]           = useState<Msg[]>([])
  const [input, setInput]         = useState("")
  const [streaming, setStreaming] = useState(false)
  const [atts, setAtts]           = useState<Att[]>([])
  const [uploading, setUploading] = useState(false)
  const [memLoaded, setMemLoaded] = useState(false)
  const [lang, setLang]           = useState<"en" | "ar">("en")
  const [provider, setProvider]   = useState("hermes3")
  const [verified, setVerified]   = useState(false)

  // Agent mode
  const [agentMode, setAgentMode]     = useState(false)
  const [agentTask, setAgentTask]     = useState("")
  const [agentPass, setAgentPass]     = useState("")
  const [agentSteps, setAgentSteps]   = useState<AgentStep[]>([])
  const [agentSummary, setAgentSummary] = useState("")
  const [agentRunning, setAgentRunning] = useState(false)
  const [agentDone, setAgentDone]     = useState(false)
  const [agentError, setAgentError]   = useState("")

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)
  const abortRef  = useRef<AbortController | null>(null)

  // Load memory on mount
  useEffect(() => {
    fetch(`${API}/admin/ai/chat`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        const mem: Msg[] = (d.messages || []).slice(-30)
        if (mem.length > 0) setMsgs(mem)
        else setMsgs([{ role: "assistant", content: "Hello! I'm your **Auto to Rental AI assistant**.\n\nI remember our previous conversations and learn from them. I respond in your language automatically.\n\nWhat can I help you with today?" }])
        if (d.ai_provider) setProvider(d.ai_provider)
        setMemLoaded(true)
      })
      .catch(() => { setMsgs([{ role: "assistant", content: "Hello! How can I help?" }]); setMemLoaded(true) })
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [msgs, agentSteps])

  // Pick up pre-filled prompt from sessionStorage (handed off by Live Traffic page)
  useEffect(() => {
    if (!memLoaded) return
    try {
      const incoming = sessionStorage.getItem("ai_initial_prompt")
      if (incoming) {
        sessionStorage.removeItem("ai_initial_prompt")
        setInput(incoming)
        // auto-focus the textarea so the owner can review then press Enter
        setTimeout(() => inputRef.current?.focus(), 200)
      }
    } catch {}
  }, [memLoaded])


  const stop = () => {
    abortRef.current?.abort()
    setStreaming(false)
    setMsgs(prev => prev.map((m, i) => i === prev.length - 1 && m.loading ? { ...m, loading: false, content: m.content + " *(stopped)*" } : m))
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    const next: Att[] = []
    for (const f of files.slice(0, 3)) {
      const isImg = f.type.startsWith("image/"), isVid = f.type.startsWith("video/")
      if (!isImg && !isVid) continue
      const url = URL.createObjectURL(f)
      if (isImg) {
        const b64 = await new Promise<string>(res => { const r = new FileReader(); r.onload = () => res((r.result as string).split(",")[1]); r.readAsDataURL(f) })
        next.push({ type: "image", url, base64: b64, name: f.name })
      } else next.push({ type: "video", url, name: f.name })
    }
    setAtts(prev => [...prev, ...next].slice(0, 3))
    setUploading(false)
    e.target.value = ""
  }

  const send = useCallback(async (text?: string) => {
    const q = (text || input).trim()
    if ((!q && atts.length === 0) || streaming) return
    setInput("")
    const curAtts = [...atts]; setAtts([])
    setMsgs(prev => [...prev,
      { role: "user", content: q, atts: curAtts },
      { role: "assistant", content: "", loading: true },
    ])
    setStreaming(true)
    const ctrl = new AbortController(); abortRef.current = ctrl
    let detectedModel = provider
    try {
      const images = curAtts.filter(a => a.type === "image" && a.base64).map(a => a.base64!)
      const r = await fetch(`${API}/admin/ai/chat`, {
        method: "POST", credentials: "include", signal: ctrl.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: q || (images.length > 0 ? "Analyze this screenshot." : "") }],
          stream: true,
          images: images.length > 0 ? images : undefined,
        }),
      })
      if (!r.ok || !r.body) throw new Error("Failed")
      const reader = r.body.getReader(), dec = new TextDecoder()
      let full = ""
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        const chunk = dec.decode(value, { stream: true })
        for (const line of chunk.split("\n").filter(l => l.startsWith("data: "))) {
          const d = line.slice(6); if (d === "[DONE]") continue
          try {
            const j = JSON.parse(d)
            if ("owner_verified" in j) { setVerified(j.owner_verified) }
            if ("lang" in j) { setLang(j.lang === "Arabic" ? "ar" : "en") }
            if ("provider" in j && j.provider) { setProvider(j.provider); detectedModel = j.provider }
            if (j.error) continue
            full += j.choices?.[0]?.delta?.content || ""
            setMsgs(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: full, loading: false } : m))
          } catch { /* skip malformed SSE */ }
        }
      }
      if (!full) full = "Sorry, I couldn't respond. Please try again."
      setMsgs(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: full, loading: false, model: detectedModel } : m))
    } catch (e: unknown) {
      const err = e as Error
      if (err?.name === "AbortError") return
      setMsgs(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: "Error: " + err?.message, loading: false } : m))
    } finally { setStreaming(false); abortRef.current = null }
  }, [input, msgs, streaming, atts, provider])

  const runAgent = async () => {
    if (!agentTask.trim()) return
    setAgentRunning(true)
    setAgentDone(false)
    setAgentError("")
    setAgentSteps([])
    setAgentSummary("")
    try {
      const r = await fetch(`${API}/admin/ai/agent`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: agentTask }),
      })
      if (!r.ok || !r.body) throw new Error("Agent request failed")
      const reader = r.body.getReader(), dec = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        const chunk = dec.decode(value, { stream: true })
        for (const line of chunk.split("\n").filter(l => l.startsWith("data: "))) {
          const d = line.slice(6); if (d === "[DONE]") continue
          try {
            const j = JSON.parse(d)
            if (j.event === "step") {
              setAgentSteps(prev => {
                const existing = prev.findIndex(s => s.step === j.step)
                const updated: AgentStep = { step: j.step, title: j.title || STEP_LABELS[j.step - 1], model: j.model || "", status: j.status || "running", result: j.result }
                if (existing >= 0) { const copy = [...prev]; copy[existing] = updated; return copy }
                return [...prev, updated]
              })
            } else if (j.event === "done") {
              setAgentSummary(j.summary || "")
              setAgentDone(true)
              setAgentRunning(false)
            } else if (j.event === "error") {
              setAgentError(j.message || "Unknown error")
              setAgentRunning(false)
            }
          } catch { /* skip */ }
        }
      }
    } catch (e: unknown) {
      const err = e as Error
      setAgentError(err?.message || "Agent failed")
      setAgentRunning(false)
    }
  }

  const clearChat = async () => {
    if (!window.confirm(tt("Clear this chat and delete its saved memory? This cannot be undone.", "مسح هذه المحادثة وحذف ذاكرتها المحفوظة؟ لا يمكن التراجع."))) return
    await fetch(`${API}/admin/ai/chat`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [], reset: true }) }).catch(() => {})
    setMsgs([{ role: "assistant", content: "Memory cleared. Fresh start!" }])
    setVerified(false)
  }

  const k = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }
  const isRTL = lang === "ar"

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-ui-bg-base" dir={isRTL ? "rtl" : "ltr"}>

      {/* ── TOP BAR ── */}
      <div className="px-5 py-3 border-b border-ui-border-base bg-ui-bg-base flex items-center gap-3 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-ui-fg-base flex items-center justify-center shrink-0">
          <Sparkles size={14} className="text-ui-bg-base" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Text className="font-semibold text-sm text-ui-fg-base">AI Assistant</Text>
            <span className="text-ui-fg-muted text-xs">·</span>
            <span className="flex items-center gap-1 text-xs text-ui-fg-subtle">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              Auto to Rental AI · Private
            </span>
          {memLoaded && (
              <span className="text-xs text-ui-fg-subtle px-2 py-0.5 rounded-md bg-ui-bg-subtle border border-ui-border-base">
                Memory on
              </span>
            )}
          </div>
        </div>
        <button onClick={clearChat} title={tt("Clear chat & delete its memory", "مسح المحادثة وحذف ذاكرتها")} className="flex items-center gap-1.5 text-xs text-ui-fg-subtle hover:text-ui-fg-error transition px-2.5 py-1.5 rounded-md bg-ui-bg-subtle hover:bg-ui-bg-base-hover border border-ui-border-base">
          🗑 {tt("Clear chat", "مسح المحادثة")}
        </button>
      </div>

      {/* ── MESSAGES ── */}
      <div className="flex-1 overflow-y-auto py-6 px-4 md:px-8 space-y-6">
        {!memLoaded && (
          <div className="flex justify-center py-12">
            <div className="flex items-center gap-2 text-ui-fg-subtle text-sm">
              <div className="w-4 h-4 border-2 border-ui-fg-muted border-t-transparent rounded-full animate-spin" />
              Loading memory…
            </div>
          </div>
        )}

        {msgs.map((msg, i) => (
          <div key={i} className={`flex gap-3 max-w-5xl w-full ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}>
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-lg shrink-0 mt-0.5 flex items-center justify-center text-[11px] font-bold ${
              msg.role === "assistant"
                ? "bg-ui-fg-base text-ui-bg-base"
                : "bg-ui-bg-subtle border border-ui-border-base text-ui-fg-muted"
            }`}>
              {msg.role === "assistant" ? <Sparkles size={13} className="text-ui-bg-base" /> : "U"}
            </div>

            <div className="flex-1 min-w-0 space-y-1.5">
              {/* Attachments */}
              {msg.atts && msg.atts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {msg.atts.map((a, ai) => (
                    <div key={ai} className="rounded-lg overflow-hidden border border-ui-border-base bg-ui-bg-subtle">
                      {a.type === "image"
                        ? <img src={a.url} alt={a.name} className="max-w-[180px] max-h-[130px] object-cover block" />
                        : <div className="flex items-center gap-2 px-3 py-2 text-xs text-ui-fg-subtle">▶ {a.name}</div>
                      }
                    </div>
                  ))}
                </div>
              )}

              {/* Message bubble */}
              {(msg.content || msg.loading) && (
                <div className={`rounded-xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-ui-fg-base text-ui-bg-base"
                    : "bg-ui-bg-component border border-ui-border-base text-ui-fg-base"
                }`}>
                  {msg.loading
                    ? <div className="flex gap-1 py-1">{[0, 1, 2].map(j => <div key={j} className="w-1.5 h-1.5 rounded-full bg-ui-fg-muted animate-bounce" style={{ animationDelay: `${j * 0.15}s` }} />)}</div>
                    : msg.role === "assistant" ? <MD text={msg.content} /> : <span>{msg.content}</span>
                  }
                </div>
              )}

              {/* Model badge below assistant messages */}
              {msg.role === "assistant" && !msg.loading && msg.model && (
                <div className="px-1">
                  <ModelBadge model={msg.model} />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Suggestions */}
        {msgs.length <= 1 && memLoaded && (
          <div className="max-w-5xl grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => send(isRTL ? s.ar : s.en)}
                className="text-left text-sm px-4 py-3 rounded-xl border border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-base-hover text-ui-fg-subtle hover:text-ui-fg-base transition"
              >
                {isRTL ? s.ar : s.en}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── ATTACHMENT PREVIEW ── */}
      {atts.length > 0 && (
        <div className="px-5 py-2 flex gap-2 flex-wrap border-t border-ui-border-base bg-ui-bg-base">
          {atts.map((a, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-ui-border-base bg-ui-bg-subtle">
              {a.type === "image"
                ? <img src={a.url} alt={a.name} className="w-14 h-14 object-cover block" />
                : <div className="w-14 h-14 flex flex-col items-center justify-center text-[9px] text-ui-fg-muted gap-1">▶<span>{a.name.slice(0, 6)}</span></div>
              }
              <button onClick={() => setAtts(prev => prev.filter((_, j) => j !== i))}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-ui-fg-base text-ui-bg-base text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── AGENT PANEL ── */}
      {agentMode && (
        <AgentPanel
          task={agentTask} setTask={setAgentTask}
          
          steps={agentSteps} summary={agentSummary}
          agentRunning={agentRunning} agentDone={agentDone} agentError={agentError}
          onRun={runAgent}
          onClose={() => { setAgentMode(false); setAgentSteps([]); setAgentSummary(""); setAgentError(""); setAgentDone(false); setAgentRunning(false) }}
        />
      )}

      {/* ── INPUT ── */}
      <div className="px-4 pb-4 pt-2 border-t border-ui-border-base bg-ui-bg-base shrink-0">
        <div className="flex gap-2 items-end rounded-xl border border-ui-border-base bg-ui-bg-field px-3 py-2 focus-within:border-ui-fg-interactive focus-within:ring-1 focus-within:ring-ui-fg-interactive/20 transition">

          {/* Attach */}
          <button onClick={() => fileRef.current?.click()} disabled={uploading || streaming} title="Attach image or video"
            className="shrink-0 w-7 h-7 flex items-center justify-center text-ui-fg-muted hover:text-ui-fg-base rounded-md hover:bg-ui-bg-base-hover transition disabled:opacity-40">
            {uploading
              ? <div className="w-3.5 h-3.5 border-2 border-ui-fg-muted border-t-transparent rounded-full animate-spin" />
              : <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
            }
          </button>
          <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm" multiple style={{ display: "none" }} onChange={handleFile} />

          {/* Agent Mode button */}
          <button
            onClick={() => setAgentMode(v => !v)}
            title="Agent Mode — multi-step AI task execution"
            className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition ${
              agentMode
                ? "bg-ui-fg-base text-ui-bg-base"
                : "text-ui-fg-muted hover:text-ui-fg-base hover:bg-ui-bg-base-hover border border-ui-border-base"
            }`}
          >
            <span>🤖</span>
            <span className="hidden sm:inline">Agent Mode</span>
          </button>

          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={k}
            disabled={streaming}
            placeholder={isRTL ? "اسأل أي شيء… أو ارفع صورة من موقعك (Enter للإرسال)" : "Ask anything… or attach a screenshot (Enter to send)"}
            rows={1}
            dir={isRTL ? "rtl" : "ltr"}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-ui-fg-base placeholder:text-ui-fg-muted py-1 min-h-[32px] max-h-[120px] disabled:opacity-60"
          />

          {/* Stop / Send */}
          {streaming
            ? <button onClick={stop} title="Stop" className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md border border-red-300 bg-red-50 text-red-500 hover:bg-red-100 transition">
              <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
            </button>
            : <button onClick={() => send()} disabled={!input.trim() && atts.length === 0}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md bg-ui-fg-base text-ui-bg-base hover:opacity-80 transition disabled:opacity-30">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
            </button>
          }
        </div>

        <div className="flex items-center justify-between mt-1.5 px-0.5">
          <span className="text-[11px] text-ui-fg-muted">
            {verified ? "Owner mode · Full permissions" : "Agent mode ready"} · "Auto to Rental AI · Private · Vision ready"
          </span>
          {atts.length > 0 && <span className="text-[11px] text-ui-fg-interactive font-medium">{atts.length} attached</span>}
        </div>
      </div>
    </div>
  )
}

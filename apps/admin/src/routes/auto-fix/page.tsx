import { useEffect, useRef, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Heading, Text, Button, Badge } from "@medusajs/ui"
import { Sparkles } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("AI Assistant", "المساعد الذكي"), icon: Sparkles, rank: 51 }

type Msg = { role: "user" | "assistant"; content: string }

const QUICK = [
  "What is broken on the platform right now?",
  "Find and fix any slow page on the storefront.",
  "Approve all pending vehicles that look legitimate.",
  "Generate unique SEO titles for every brand page.",
  "Restart the API and confirm it is healthy.",
]

export default function AutoFixPage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [running, setRunning] = useState(false)
  const [health, setHealth] = useState<any>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => { loadHealth() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  async function loadHealth() {
    try { const r = await fetch(`${API}/admin/overview`, { credentials: "include" }); if (r.ok) setHealth(await r.json()) } catch {}
  }

  function appendAssistant(t: string) {
    setMessages((m) => { const c = [...m]; const last = c[c.length - 1]; if (last && last.role === "assistant") last.content += t; return c })
  }

  async function send(text: string) {
    if (running || !text.trim()) return
    const next: Msg[] = [...messages, { role: "user", content: text }]
    setMessages([...next, { role: "assistant", content: "" }])
    setInput(""); setRunning(true)
    const ctrl = new AbortController(); abortRef.current = ctrl
    try {
      const r = await fetch(`${API}/admin/ai/chat`, {
        method: "POST", credentials: "include", signal: ctrl.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, stream: true }),
      })
      if (!r.ok || !r.body) { appendAssistant(`\n_[error: API ${r.status}]_`); return }
      const reader = r.body.getReader(), dec = new TextDecoder(); let buf = ""
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split("\n"); buf = lines.pop() || ""
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const payload = line.slice(6).trim()
          if (payload === "[DONE]" || !payload) continue
          try { const d = JSON.parse(payload); const t = d.choices?.[0]?.delta?.content || ""; if (t) appendAssistant(t) } catch {}
        }
      }
    } catch (e: any) { if (e?.name !== "AbortError") appendAssistant(`\n_[error: ${e?.message}]_`) }
    finally { setRunning(false); loadHealth() }
  }

  function metric(label: string, val: any, accent?: string) {
    return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px">
      <div style="font-size:12px;color:#64748b;font-weight:600">${label}</div>
      <div style="font-size:26px;font-weight:800;color:${accent || "#0f172a"};margin-top:4px">${val ?? "—"}</div></div>`
  }
  function reportHtml() {
    const h = health || {}
    const now = new Date().toLocaleString()
    const attention = (Number(h.pending_approvals) || 0) + (Number(h.trials_expiring_7d) || 0)
    return `<!doctype html><html><head><meta charset="utf-8"><title>Auto to Rental — Health Report</title>
    <style>@page{margin:0;size:A4}*{box-sizing:border-box}
    body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a2332;margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{max-width:820px;margin:0 auto}
    .band{background:linear-gradient(135deg,#0a1830,#13294f 55%,#0a1830);color:#fff;padding:32px 48px 28px;position:relative}
    .band::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,#b8860b,#f0d27a,#b8860b)}
    .brow{display:flex;align-items:center;justify-content:space-between}
    .brand{display:flex;align-items:center;gap:14px}
    .brand img{height:48px;width:auto;display:block;filter:brightness(0) invert(1)}
    .brand .nm{font-family:Georgia,serif;font-size:19px;font-weight:700;letter-spacing:.3px}
    .brand .nm i{color:#f0d27a;font-style:normal}
    .brand .tag{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#9fb0cc;margin-top:5px}
    .pill{display:inline-block;padding:5px 14px;border-radius:999px;font-size:10.5px;font-weight:700;letter-spacing:.6px}
    .ok{background:rgba(240,210,122,.16);color:#f0d27a;border:1px solid rgba(240,210,122,.45)}
    .warn{background:rgba(252,211,77,.2);color:#fcd34d;border:1px solid rgba(252,211,77,.5)}
    .dt{font-size:10.5px;color:#9fb0cc;margin-top:9px;text-align:right}
    .tw{padding:34px 48px 0}.tt{font-family:Georgia,serif;font-size:30px;font-weight:700;letter-spacing:-.3px;margin:0;color:#0a1830}
    .ts{font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:#9a8a5c;margin-top:7px}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);margin:26px 48px;border:1px solid #ece6d8;border-radius:12px;overflow:hidden}
    .cell{padding:20px 22px;border-right:1px solid #f1ece0;border-bottom:1px solid #f1ece0}
    .cell:nth-child(3n){border-right:none}.cell:nth-last-child(-n+3){border-bottom:none}
    .cell .l{font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#9098a8;font-weight:600}
    .cell .v{font-family:Georgia,serif;font-size:29px;font-weight:700;margin-top:9px;color:#0a1830}
    .sec{padding:0 48px}.sec h2{font-family:Georgia,serif;font-size:16px;color:#0a1830;margin:24px 0 2px;font-weight:700}
    .sec h2::after{content:"";display:block;width:34px;height:2px;background:#b8860b;margin-top:8px}
    .row{display:flex;justify-content:space-between;align-items:center;padding:13px 2px;border-bottom:1px solid #f2efe7;font-size:13px}
    .row span{color:#4a5566}.row b{font-family:Georgia,serif;font-size:16px;color:#0a1830}
    .foot{margin:32px 48px 0;padding:16px 0 34px;border-top:1px solid #ece6d8;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#a7adba}
    .foot i{font-family:Georgia,serif;font-style:italic;color:#b8860b}</style></head>
    <body><div class="page">
    <div class="band"><div class="brow">
      <div class="brand"><img src="https://autotorental.com/logo.png" alt=""></div>
      <div><span class="pill ${attention>0?"warn":"ok"}">${attention>0?attention+" NEED ATTENTION":"ALL HEALTHY"}</span><div class="dt">${now}</div></div>
    </div></div>
    <div class="tw"><h1 class="tt">Platform Health Report</h1><div class="ts">Confidential &middot; Executive Summary</div></div>
    <div class="grid">
      <div class="cell"><div class="l">Rental Companies</div><div class="v">${h.companies ?? "&mdash;"}</div></div>
      <div class="cell"><div class="l">Live Vehicles</div><div class="v">${h.vehicles ?? "&mdash;"}</div></div>
      <div class="cell"><div class="l">Paying Vendors</div><div class="v">${h.paying_vendors ?? "&mdash;"}</div></div>
      <div class="cell"><div class="l">Trial Vendors</div><div class="v">${h.trial_vendors ?? "&mdash;"}</div></div>
      <div class="cell"><div class="l">Pending Approvals</div><div class="v">${h.pending_approvals ?? "&mdash;"}</div></div>
      <div class="cell"><div class="l">Est. MRR (AED)</div><div class="v">${h.est_mrr_aed ?? "&mdash;"}</div></div>
    </div>
    <div class="sec"><h2>Action Items</h2>
      <div class="row"><span>Vehicles waiting for approval</span><b>${h.pending_approvals ?? 0}</b></div>
      <div class="row"><span>Trials expiring within 7 days</span><b>${h.trials_expiring_7d ?? 0}</b></div>
      <div class="row"><span>Paying vendors (active subscriptions)</span><b>${h.paying_vendors ?? 0}</b></div>
    </div>
    <div class="foot"><span>Generated by the Auto to Rental AI Assistant</span><i>Auto to Rental &middot; Confidential</i></div>
    </div></body></html>`
  }
  function downloadPdf() {
    const w = window.open("", "_blank"); if (!w) return
    w.document.write(reportHtml()); w.document.close(); setTimeout(() => { try { w.print() } catch {} }, 800)
  }

  const h = health || {}
  const attention = (Number(h.pending_approvals) || 0) + (Number(h.trials_expiring_7d) || 0)

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start", height: "calc(100vh - 120px)" }}>
      {/* LEFT — chat / orders */}
      <div style={{ flex: "1.5 1 0", display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-base,#fff)", border: "1px solid var(--border-base,#e5e7eb)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-base,#e5e7eb)", display: "flex", alignItems: "center", gap: 10 }}>
          <Sparkles />
          <div>
            <Heading level="h2" style={{ fontSize: 16 }}>AI Assistant</Heading>
            <Text size="xsmall" className="text-ui-fg-subtle">Chat and give it orders — it can read, fix, deploy and restart your platform.</Text>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.length === 0 && (
            <div style={{ margin: "auto", textAlign: "center", maxWidth: 420 }}>
              <Text className="text-ui-fg-muted" style={{ marginBottom: 14 }}>Ask anything or give an order:</Text>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {QUICK.map((q, i) => (
                  <Button key={i} variant="secondary" size="small" onClick={() => send(q)} className="rounded-full">{q}</Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "82%", background: m.role === "user" ? "#2563eb" : "var(--bg-subtle,#f1f5f9)", color: m.role === "user" ? "#fff" : "var(--fg-base,#0f172a)", padding: "10px 14px", borderRadius: 14, whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.5 }}>
              {m.content || (running && i === messages.length - 1 ? "…" : "")}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: 12, borderTop: "1px solid var(--border-base,#e5e7eb)", display: "flex", gap: 8 }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input) } }} placeholder="Type an order… e.g. 'restart the API' or 'what is broken?'" disabled={running}
            style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1px solid var(--border-base,#e5e7eb)", fontSize: 14, background: "var(--bg-field,#fff)", color: "var(--fg-base,#0f172a)" }} />
          {running
            ? <Button variant="secondary" onClick={() => abortRef.current?.abort()}>Stop</Button>
            : <Button variant="primary" onClick={() => send(input)} disabled={!input.trim()}>Send</Button>}
        </div>
      </div>

      {/* RIGHT — professional health report */}
      <div style={{ flex: "1 1 0", minWidth: 320, maxWidth: 420, height: "100%", display: "flex", flexDirection: "column", background: "var(--bg-base,#fff)", border: "1px solid var(--border-base,#e5e7eb)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-base,#e5e7eb)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Heading level="h2" style={{ fontSize: 16 }}>Health Report</Heading>
          <Badge size="2xsmall" color={attention > 0 ? "orange" : "green"}>{attention > 0 ? `${attention} to review` : "Healthy"}</Badge>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
            {[["Companies", h.companies], ["Live vehicles", h.vehicles], ["Paying vendors", h.paying_vendors], ["Trial vendors", h.trial_vendors], ["Pending approvals", h.pending_approvals], ["Est. MRR (AED)", h.est_mrr_aed]].map(([l, v], i) => (
              <div key={i} style={{ background: "var(--bg-subtle,#f8fafc)", border: "1px solid var(--border-base,#e5e7eb)", borderRadius: 12, padding: "12px 14px" }}>
                <Text size="xsmall" className="text-ui-fg-subtle">{l as string}</Text>
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{(v as any) ?? "—"}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 18 }}>
            <Text size="small" weight="plus" style={{ marginBottom: 8 }}>Action items</Text>
            {[["Vehicles waiting for approval", h.pending_approvals], ["Trials expiring within 7 days", h.trials_expiring_7d], ["Active paying vendors", h.paying_vendors]].map(([l, v], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border-base,#f1f5f9)", fontSize: 13 }}>
                <span className="text-ui-fg-subtle">{l as string}</span><b>{(v as any) ?? 0}</b>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: 12, borderTop: "1px solid var(--border-base,#e5e7eb)", display: "flex", gap: 8 }}>
          <Button variant="secondary" onClick={loadHealth} style={{ flex: 1 }}>Refresh</Button>
          <Button variant="primary" onClick={downloadPdf} style={{ flex: 1 }}>Download PDF</Button>
        </div>
      </div>
    </div>
  )
}

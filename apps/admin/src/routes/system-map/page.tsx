import { useEffect, useMemo, useRef, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Map as MapIcon } from "@medusajs/icons"
import { API } from "../../lib/api"
import { tt } from "../../lib/lang"

export const config: RouteConfig = { label: tt("System Map", "خريطة النظام"), icon: MapIcon, rank: 17 }

const STC: Record<string, string> = { ok: "#10b981", warn: "#f59e0b", down: "#ef4444", off: "#64748b" }
const LS_KEY = "atr_sysflow_layout_v2"

const CAT_ID: Record<string, string> = {
  api: "BACKEND", storefront: "FRONTEND", blog: "FRONTEND", mobile: "FRONTEND",
  db: "DATA", search: "DATA", media: "DATA", livekit: "COMMS", livekit_token: "COMMS",
}
const CAT_GROUP: Record<string, string> = { ai: "AI", infra: "INFRA", pay: "PAY", calls: "COMMS", core: "CORE", ads: "ADS" }
const catOf = (n: any) => CAT_ID[n.id] || CAT_GROUP[n.group] || "SVC"

const EDGE_LABEL: Record<string, string> = {
  storefront: "web", blog: "blog", mobile: "app", media: "files", db: "data", search: "search",
  livekit: "calls", livekit_token: "calls", openai: "AI", claude: "AI", hf: "AI", fal: "AI",
  aivideo: "AI", cloudflare: "cdn", firebase: "push", google: "geo", email: "mail",
  clarity: "stats", bing: "seo", rapidapi: "vin", mollie: "pay", stripe: "pay",
}

const COL: Record<string, number> = { FRONTEND: 0, BACKEND: 1, DATA: 2, COMMS: 2, AI: 3, INFRA: 4, PAY: 4, CORE: 2, SVC: 3, ADS: 5 }
const COLX = [40, 330, 630, 930, 1230, 1530]
const CANVAS_W = 1460
const CW = 200, CH = 58, VSP = 88

function speedColor(ms: number | null, status: string): string {
  if (status === "down") return STC.down
  if (status === "off") return STC.off
  if (ms == null) return STC.warn
  if (ms < 50) return "#10b981"
  if (ms < 200) return "#3b82f6"
  return "#f59e0b"
}

export default function Page() {
  const [data, setData] = useState<any>(null)
  const [view, setView] = useState<"cards" | "flow" | "both">("both")
  const [paused, setPaused] = useState(false)
  const [zoom, setZoom] = useState(0.72)
  const [over, setOver] = useState<Record<string, { x: number; y: number }>>({})
  const [sel, setSel] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [showLabels, setShowLabels] = useState(false)
  const [saved, setSaved] = useState(false)
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null)

  useEffect(() => { try { const s = localStorage.getItem(LS_KEY); if (s) setOver(JSON.parse(s)) } catch {} }, [])
  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(over)) } catch {} }, [over])

  const load = () => fetch(`${API}/admin/system-map`, { credentials: "include" }).then((r) => r.json()).then(setData).catch(() => {})
  useEffect(() => { load() }, [])
  useEffect(() => { if (paused) return; const iv = setInterval(load, 20000); return () => clearInterval(iv) }, [paused])

  const nodes: any[] = data?.nodes || []
  const edges: any[] = data?.edges || []
  const byId = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes])

  const defPos = useMemo(() => {
    const colMap: Record<number, any[]> = {}
    nodes.forEach((n) => { const c = COL[catOf(n)] ?? 2; (colMap[c] ||= []).push(n) })
    const p: Record<string, { x: number; y: number }> = {}
    Object.entries(colMap).forEach(([c, ns]) => ns.forEach((n, i) => { p[n.id] = { x: COLX[+c] ?? 480, y: 20 + i * VSP } }))
    return p
  }, [nodes])
  const posOf = (id: string) => over[id] || defPos[id] || { x: 480, y: 20 }
  const canvasH = useMemo(() => Math.max(620, ...nodes.map((n) => posOf(n.id).y + CH + 30)), [nodes, over, defPos])

  const sum = data?.summary || { ok: 0, warn: 0, down: 0, off: 0 }
  const msVals = nodes.map((n) => n.ms).filter((m) => typeof m === "number")
  const avgMs = msVals.length ? Math.round(msVals.reduce((a, b) => a + b, 0) / msVals.length) : 0
  const healthyEdges = edges.filter((e) => { const t = byId[e.to === "api" ? e.from : e.to]; return t && t.status !== "down" }).length
  // Operational health = monitored services that aren't down (off = not configured, excluded).
  const monitored = sum.ok + sum.warn + sum.down
  const opPct = monitored > 0 ? Math.round((sum.ok / monitored) * 100) : 100
  const opColor = sum.down > 0 ? "#ef4444" : sum.warn > 0 ? "#f59e0b" : "#10b981"
  const pct = (n: number) => (monitored > 0 ? (n / monitored) * 100 : 0)
  const GROUP_ORDER = ["CORE", "BACKEND", "FRONTEND", "DATA", "COMMS", "AI", "INFRA", "PAY", "ADS", "SVC"]
  const groupsToShow = Array.from(new Set([...GROUP_ORDER, ...nodes.map(catOf)])).filter((g) => nodes.some((n) => catOf(n) === g))

  const onDown = (e: React.MouseEvent, id: string) => {
    const p = posOf(id); drag.current = { id, dx: e.clientX / zoom - p.x, dy: e.clientY / zoom - p.y }; setDragId(id)
    const move = (ev: MouseEvent) => { if (!drag.current) return; setOver((o) => ({ ...o, [drag.current!.id]: { x: Math.max(0, ev.clientX / zoom - drag.current!.dx), y: Math.max(0, ev.clientY / zoom - drag.current!.dy) } })) }
    const up = () => { drag.current = null; setDragId(null); setSaved(true); setTimeout(() => setSaved(false), 1600); window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up) }
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up)
  }

  const Pill = ({ n, color, bg }: { n: number; color: string; bg: string }) => (
    <span style={{ background: bg, color, padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>{n}</span>
  )
  const Toggle = ({ v, label }: { v: any; label: string }) => (
    <button onClick={() => setView(v)} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1px solid var(--border-base)", background: view === v ? "var(--bg-subtle)" : "transparent", color: "var(--fg-base)" }}>{label}</button>
  )

  const Card = ({ n, inFlow }: { n: any; inFlow?: boolean }) => {
    const c = STC[n.status] || STC.off
    return (
      <div
        onMouseDown={inFlow ? (e) => onDown(e, n.id) : undefined}
        onClick={() => { if (n.link) (n.link.startsWith("http") ? window.open(n.link, "_blank") : window.location.assign(n.link)); else setSel(n.id) }}
        style={{
          position: inFlow ? "absolute" : "relative", left: inFlow ? posOf(n.id).x : undefined, top: inFlow ? posOf(n.id).y : undefined,
          width: inFlow ? CW : "100%", minHeight: CH, boxSizing: "border-box",
          background: "#0b1220", border: `1px solid ${c}`, borderRadius: 12, padding: "10px 12px",
          boxShadow: n.status === "down" ? `0 0 0 2px ${c}66, 0 0 18px ${c}55` : `0 0 14px ${c}33`,
          cursor: inFlow ? (dragId === n.id ? "grabbing" : "grab") : "pointer", userSelect: "none",
          display: "flex", flexDirection: "column", gap: 3, zIndex: dragId === n.id ? 20 : 2,
        }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
          <span style={{ color: "#e5e7eb", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.icon} {n.label}</span>
          <span style={{ width: 9, height: 9, borderRadius: 99, background: c, flexShrink: 0, boxShadow: `0 0 8px ${c}` }} />
        </div>
        <span style={{ color: "#7c8aa0", fontSize: 10.5, letterSpacing: 0.4 }}>{catOf(n)} · {typeof n.ms === "number" ? n.ms + "MS" : n.status === "off" ? "OFF" : (n.status || "—").toUpperCase()}</span>
        {!inFlow && n.detail && <span style={{ color: "#5b6b82", fontSize: 9.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={n.detail}>{n.detail}</span>}
      </div>
    )
  }

  const center = (id: string) => { const p = posOf(id); return { x: p.x + CW / 2, y: p.y + CH / 2 } }

  return (
    <div className="flex w-full flex-col gap-y-3">
      <div className="rounded-lg bg-ui-bg-base border border-ui-border-base p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-ui-border-base flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ui-fg-base">{tt("System Flow", "تدفّق النظام")}</h1>
            <p className="text-ui-fg-subtle text-sm mt-0.5">{tt("Live status + real ping between services. Drag nodes to arrange — your layout saves automatically. Toggle “Pings” for edge times.", "الحالة المباشرة + زمن الاستجابة. اسحب العقد لترتيبها — يُحفظ ترتيبك تلقائياً. زر «الأزمنة» يُظهر أوقات الوصلات.")}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Pill n={sum.ok} color="#059669" bg="rgba(16,185,129,.14)" /><span className="text-xs text-ui-fg-subtle -ml-1 mr-1">{tt("healthy", "سليمة")}</span>
            <Pill n={sum.warn} color="#b45309" bg="rgba(245,158,11,.14)" /><span className="text-xs text-ui-fg-subtle -ml-1 mr-1">{tt("degraded", "متوسطة")}</span>
            <Pill n={sum.down} color="#dc2626" bg="rgba(239,68,68,.14)" /><span className="text-xs text-ui-fg-subtle -ml-1 mr-1">{tt("down", "معطّلة")}</span>
            <span className="text-xs text-ui-fg-muted mx-1">· avg {avgMs}ms ·</span>
            <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-base)" }}><Toggle v="cards" label={tt("Cards", "بطاقات")} /><Toggle v="flow" label={tt("Flow", "تدفّق")} /><Toggle v="both" label={tt("Both", "الكل")} /></div>
            <button onClick={() => setPaused((p) => !p)} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1px solid var(--border-base)", background: "transparent", color: "var(--fg-base)" }}>{paused ? "▶ " + tt("Resume", "استئناف") : "⏸ " + tt("Pause", "إيقاف")}</button>
            <button onClick={load} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1px solid var(--border-base)", background: "transparent", color: "var(--fg-base)" }}>↻ {tt("Refresh", "تحديث")}</button>
            <button onClick={() => setShowLabels((v) => !v)} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1px solid var(--border-base)", background: showLabels ? "var(--bg-subtle)" : "transparent", color: "var(--fg-base)" }}>🏷 {tt("Pings", "الأزمنة")}</button>
            {saved && <span style={{ background: "rgba(16,185,129,.16)", color: "#059669", padding: "5px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>✓ {tt("Layout saved", "تم حفظ الترتيب")}</span>}
          </div>
        </div>

        <div className="px-6 py-3 border-b border-ui-border-base flex items-center gap-4 flex-wrap">
          <style>{`@keyframes pls{0%{transform:scale(1);opacity:.55}100%{transform:scale(2.6);opacity:0}}`}</style>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ position: "relative", display: "inline-flex", width: 9, height: 9 }}>
              <span style={{ width: 9, height: 9, borderRadius: 99, background: opColor, boxShadow: `0 0 8px ${opColor}` }} />
              {!paused && <span style={{ position: "absolute", inset: 0, borderRadius: 99, background: opColor, animation: "pls 1.5s infinite" }} />}
            </span>
            <span style={{ fontSize: 26, fontWeight: 800, color: opColor, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{opPct}%</span>
            <span className="text-ui-fg-subtle text-sm">{tt("operational", "تعمل بكفاءة")}</span>
          </div>
          <div style={{ flex: 1, minWidth: 160, height: 8, borderRadius: 99, background: "rgba(120,120,140,.15)", overflow: "hidden", display: "flex" }}>
            <div style={{ width: `${pct(sum.ok)}%`, background: "#10b981" }} />
            <div style={{ width: `${pct(sum.warn)}%`, background: "#f59e0b" }} />
            <div style={{ width: `${pct(sum.down)}%`, background: "#ef4444" }} />
          </div>
          <span className="text-xs text-ui-fg-muted" style={{ whiteSpace: "nowrap" }}>
            {sum.ok} {tt("healthy", "سليمة")} · {sum.warn} {tt("degraded", "متوسطة")} · {sum.down} {tt("down", "معطّلة")} · {sum.off} {tt("off", "متوقفة")} · avg {avgMs}ms · {!paused ? tt("live", "مباشر") : tt("paused", "متوقف")}
          </span>
        </div>

        <div className="px-6 py-2.5 border-b border-ui-border-base flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4 text-xs text-ui-fg-subtle flex-wrap">
            <span>{tt("Edge speed", "سرعة الوصلة")}:</span>
            <span className="flex items-center gap-1"><i style={{ width: 14, height: 3, background: "#10b981", display: "inline-block", borderRadius: 2 }} /> {tt("Fast", "سريع")} (&lt;50ms)</span>
            <span className="flex items-center gap-1"><i style={{ width: 14, height: 3, background: "#3b82f6", display: "inline-block", borderRadius: 2 }} /> OK (50-200ms)</span>
            <span className="flex items-center gap-1"><i style={{ width: 14, height: 3, background: "#f59e0b", display: "inline-block", borderRadius: 2 }} /> {tt("Slow", "بطيء")} (&gt;200ms)</span>
            <span className="flex items-center gap-1"><i style={{ width: 14, height: 3, background: "#ef4444", display: "inline-block", borderRadius: 2 }} /> {tt("Down", "معطّل")}</span>
          </div>
          <span className="text-xs text-ui-fg-muted">{healthyEdges}/{edges.length} {tt("connections healthy", "وصلة سليمة")}</span>
        </div>

        {sum.down > 0 && (
          <div className="mx-6 mt-3 rounded-xl p-3" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.4)" }}>
            <span className="text-ui-fg-error text-sm font-semibold">⚠️ {sum.down} {tt("service(s) DOWN", "خدمة معطّلة")}: </span>
            <span className="text-ui-fg-error text-sm">{nodes.filter((n) => n.status === "down").map((n) => n.label).join(", ")}</span>
          </div>
        )}

        {(view === "cards" || view === "both") && (
          <div className="px-6 py-5 flex flex-col gap-5">
            {groupsToShow.map((g) => {
              const gn = nodes.filter((n) => catOf(n) === g)
              return (
                <div key={g}>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ui-fg-muted mb-2.5">{g} <span className="opacity-50">({gn.length})</span></div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                    {gn.map((n) => <Card key={n.id} n={n} />)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {(view === "flow" || view === "both") && (
          <div className="px-6 pb-4 pt-2">
            <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "radial-gradient(120% 120% at 50% 0%, #10213f 0%, #0b1220 60%)", border: "1px solid var(--border-base)", height: 640 }}>
              <div style={{ position: "absolute", inset: 0, transformOrigin: "0 0", transform: `scale(${zoom})`, width: CANVAS_W, height: canvasH }}>
                <svg width={CANVAS_W} height={canvasH} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                  <style>{`@keyframes dash{to{stroke-dashoffset:-22}}`}</style>
                  {edges.map((e, i) => {
                    const a = center(e.from), b = center(e.to)
                    const t = byId[e.to === "api" ? e.from : e.to] || byId[e.to]
                    const col = speedColor(t?.ms ?? null, t?.status || "off")
                    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
                    const lbl = `${EDGE_LABEL[t?.id] || ""}${typeof t?.ms === "number" ? " · " + t.ms + "ms" : ""}`.trim()
                    return (
                      <g key={i}>
                        <path d={`M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`} fill="none" stroke={col} strokeWidth={1.5} strokeDasharray="6 6" style={{ animation: "dash 1.1s linear infinite", opacity: 0.4 }} />
                        {showLabels && lbl && (<g><rect x={mx - 36} y={my - 9} width={72} height={18} rx={9} fill="#0b1220" stroke={col} strokeWidth={1} /><text x={mx} y={my + 3} textAnchor="middle" fontSize={9.5} fill="#cbd5e1">{lbl}</text></g>)}
                      </g>
                    )
                  })}
                </svg>
                {nodes.map((n) => <Card key={n.id} n={n} inFlow />)}
              </div>

              <div style={{ position: "absolute", left: 12, bottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                {[["+", () => setZoom((z) => Math.min(1.6, z + 0.1))], ["−", () => setZoom((z) => Math.max(0.4, z - 0.1))], ["⤢", () => { setZoom(0.9); setOver({}) }]].map(([t2, fn]: any, i) => (
                  <button key={i} onClick={fn} style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(8,15,30,.92)", border: "1px solid #2a3a55", color: "#cbd5e1", cursor: "pointer", fontSize: 16 }}>{t2}</button>
                ))}
              </div>
              <div style={{ position: "absolute", right: 12, bottom: 12, width: 150, height: 92, background: "rgba(8,15,30,.92)", border: "1px solid #2a3a55", borderRadius: 8, overflow: "hidden" }}>
                {nodes.map((n) => { const p = posOf(n.id); return <span key={n.id} style={{ position: "absolute", left: 6 + (p.x / CANVAS_W) * 138, top: 6 + (p.y / canvasH) * 80, width: 6, height: 6, borderRadius: 2, background: STC[n.status] || STC.off }} /> })}
              </div>
            </div>
          </div>
        )}

        <div className="px-6 py-2 text-xs text-ui-fg-muted border-t border-ui-border-base">
          {tt("Last refresh", "آخر تحديث")}: {data?.checked_at ? new Date(data.checked_at).toLocaleTimeString() : "—"} · {edges.length} {tt("edges measured", "وصلة مقيسة")}
        </div>
      </div>

      {sel && byId[sel] && (
        <div className="rounded-lg bg-ui-bg-base border border-ui-border-base p-4" onClick={() => setSel(null)}>
          <div className="font-semibold text-ui-fg-base">{byId[sel].icon} {byId[sel].label}</div>
          <div className="text-sm text-ui-fg-subtle mt-1">{catOf(byId[sel])} · {byId[sel].status?.toUpperCase()} · {byId[sel].detail}</div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Container, Heading, Text, Button, Badge } from "@medusajs/ui"
import { MediaPlay } from "@medusajs/icons"
import { tt } from "../../lib/lang"
import { API } from "../../lib/api"
// Use rrweb's raw Replayer (NOT rrweb-player): the rrweb-player wrapper mounts
// .rr-player but fails to create the replay iframe in this admin (blank). The
// raw Replayer renders correctly; we add our own play/pause/seek/speed controls.
import { Replayer } from "rrweb"
import "rrweb/dist/style.css"

export const config: RouteConfig = { label: tt("Recordings", "التسجيلات"), icon: MediaPlay, rank: 23 }

type Rec = {
  id: string; session_id: string; path: string; country: string
  device: string; started_at: string; updated_at: string
  duration_ms: number; event_count: number
}

function flagEmoji(cc?: string) {
  if (!cc || cc.length !== 2) return "🌐"
  try { return String.fromCodePoint(...cc.toUpperCase().split("").map((c) => 127397 + c.charCodeAt(0))) } catch { return "🌐" }
}
function devIcon(d?: string) {
  const x = (d || "").toLowerCase()
  if (x.includes("mobile") || x.includes("phone")) return "📱"
  if (x.includes("tablet")) return "📟"
  return "💻"
}
function fmtDur(ms?: number) {
  const s = Math.round((ms || 0) / 1000)
  if (s < 60) return s + "s"
  const m = Math.floor(s / 60)
  return m + "m " + (s % 60) + "s"
}
// m:ss clock for the player time counter (e.g. 0:07 / 10:33)
function clock(ms?: number) {
  const s = Math.max(0, Math.floor((ms || 0) / 1000))
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0")
}
function ago(d?: string) {
  if (!d) return ""
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return m + "m ago"
  const h = Math.floor(m / 60)
  if (h < 24) return h + "h ago"
  return Math.floor(h / 24) + "d ago"
}

export default function RecordingsPage() {
  const [list, setList] = useState<Rec[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [playLoading, setPlayLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(2)
  const [progress, setProgress] = useState(0)
  const [curMs, setCurMs] = useState(0)
  const mountRef = useRef<HTMLDivElement | null>(null)
  const repRef = useRef<any>(null)
  const totalRef = useRef(1)
  const tickRef = useRef<any>(null)

  const load = (silent?: boolean) => {
    if (!silent) setLoading(true)
    setErr("")
    fetch(`${API}/admin/recordings`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setList(d.recordings || []))
      .catch(() => { if (!silent) setErr("Could not load recordings.") })
      .finally(() => { if (!silent) setLoading(false) })
  }
  useEffect(() => { load(); const t = setInterval(() => load(true), 15000); return () => clearInterval(t) }, [])

  const stopTick = () => { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null } }

  // Scale the recorded viewport (often 1280–1680px wide) down to fit the pane.
  const fit = () => {
    const root = mountRef.current
    if (!root) return
    const wrap = root.querySelector(".replayer-wrapper") as HTMLElement | null
    const iframe = root.querySelector("iframe") as HTMLIFrameElement | null
    if (!wrap || !iframe) return
    const recW = parseInt(iframe.style.width) || iframe.clientWidth || 1280
    const recH = parseInt(iframe.style.height) || iframe.clientHeight || 720
    const contW = root.clientWidth || 800
    const scale = Math.min(1, contW / recW)
    wrap.style.transform = `scale(${scale})`
    wrap.style.transformOrigin = "top left"
    root.style.height = `${Math.round(recH * scale)}px`
  }

  const play = async (rec: Rec) => {
    setActiveId(rec.id); setPlayLoading(true); setErr(""); setProgress(0); setCurMs(0); setPlaying(false); stopTick()
    try {
      const d = await fetch(`${API}/admin/recordings/${rec.id}`, { credentials: "include" }).then((r) => r.json())
      const events = (((d && d.events) || []) as any[]).slice().sort((a, b) => ((a && a.timestamp) || 0) - ((b && b.timestamp) || 0))
      try { repRef.current?.pause?.() } catch {}
      if (mountRef.current) { mountRef.current.innerHTML = ""; mountRef.current.style.height = "" }
      repRef.current = null
      if (events.length < 2) { setErr(tt("This session is too short to replay.", "هذه الجلسة قصيرة جدًا للتشغيل.")); setPlayLoading(false); return }
      setPlayLoading(false)
      // mountRef is visible now (activeId set); create the Replayer into it.
      const rep = new Replayer(events, { root: mountRef.current!, skipInactive: true, showWarning: false, mouseTail: false, speed })
      repRef.current = rep
      rep.on("finish", () => setPlaying(false))
      // let the iframe mount, then scale-to-fit and start.
      setTimeout(() => {
        fit()
        try { rep.play(0) } catch {}
        setPlaying(true)
        try { totalRef.current = rep.getMetaData().totalTime || 1 } catch { totalRef.current = 1 }
        tickRef.current = setInterval(() => {
          try { const t = rep.getCurrentTime(); setCurMs(t); setProgress(Math.max(0, Math.min(1, t / (totalRef.current || 1)))) } catch {}
        }, 200)
      }, 120)
    } catch {
      setErr(tt("Could not play this recording.", "تعذّر تشغيل هذا التسجيل."))
      setPlayLoading(false)
    }
  }

  const toggle = () => {
    const r = repRef.current; if (!r) return
    if (playing) { try { r.pause() } catch {}; setPlaying(false) }
    else { try { r.play(r.getCurrentTime()) } catch {}; setPlaying(true) }
  }
  const restart = () => { const r = repRef.current; if (!r) return; try { r.play(0) } catch {}; setPlaying(true); setProgress(0); setCurMs(0) }
  const setSpd = (s: number) => { setSpeed(s); try { repRef.current?.setConfig?.({ speed: s }) } catch {} }
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = repRef.current; if (!r) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    try { r.play(pct * (totalRef.current || 0)) } catch {}
    setPlaying(true); setProgress(pct)
  }
  const close = () => {
    try { repRef.current?.pause?.() } catch {}
    stopTick(); repRef.current = null
    if (mountRef.current) { mountRef.current.innerHTML = ""; mountRef.current.style.height = "" }
    setActiveId(null); setPlaying(false); setProgress(0); setCurMs(0); setErr("")
  }

  useEffect(() => () => stopTick(), [])
  const activeRec = list.find((r) => r.id === activeId)

  return (
    <Container className="p-0 overflow-hidden">
      <div className="px-6 py-5 border-b border-ui-border-base flex items-center justify-between flex-wrap gap-3">
        <div>
          <Heading level="h1">Session Recordings</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Real visitor sessions replayed inside your dashboard — no external site. Last 14 days.
          </Text>
        </div>
        <Button variant="secondary" size="small" onClick={() => load()} disabled={loading}>Refresh</Button>
      </div>

      {err ? <div className="px-6 py-3"><Text className="text-ui-fg-error" size="small">{err}</Text></div> : null}

      {/* Session list — click a row to open the replay in a modal */}
      <div className="max-h-[680px] overflow-auto">
        {loading ? (
          <div className="p-6"><Text size="small" className="text-ui-fg-subtle">Loading…</Text></div>
        ) : list.length === 0 ? (
          <div className="p-6">
            <Text size="small" className="text-ui-fg-subtle">
              No recordings yet. They appear here automatically as visitors browse autotorental.com.
            </Text>
          </div>
        ) : (
          list.map((r) => (
            <button
              key={r.id}
              onClick={() => play(r)}
              className="w-full text-left px-6 py-3 border-b border-ui-border-base hover:bg-ui-bg-base-hover transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate flex items-center gap-2">
                  <MediaPlay className="text-ui-fg-interactive shrink-0" />
                  {flagEmoji(r.country)} {devIcon(r.device)} {r.path || "/"}
                </span>
                <Badge size="2xsmall" color={(r.duration_ms || 0) > 20000 ? "green" : "grey"}>{fmtDur(r.duration_ms)}</Badge>
              </div>
              <div className="text-ui-fg-subtle text-xs mt-1 flex items-center justify-between">
                <span>{ago(r.updated_at)}</span>
                <span>{r.event_count} events</span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Real video-player modal — dark chrome, big play, prominent time counter */}
      {activeId ? (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) close() }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <style>{"@keyframes atr-spin{to{transform:rotate(360deg)}}"}</style>
          <div style={{ borderRadius: 16, width: "min(1180px, 96vw)", maxHeight: "94vh", overflow: "hidden", background: "#0b0b0f", boxShadow: "0 24px 80px rgba(0,0,0,.6)", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff", fontSize: 13, fontWeight: 600, minWidth: 0 }}>
                <span style={{ whiteSpace: "nowrap" }}>🎬 {tt("Session replay", "تشغيل الجلسة")}</span>
                {activeRec ? <span style={{ color: "#9aa0aa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>· {flagEmoji(activeRec.country)} {activeRec.path || "/"}</span> : null}
                {activeRec ? <span style={{ flexShrink: 0, fontSize: 11, color: "#9aa0aa", border: "1px solid rgba(255,255,255,.15)", borderRadius: 20, padding: "2px 8px" }}>{devIcon(activeRec.device)} {ago(activeRec.updated_at)}</span> : null}
              </div>
              <button onClick={close} style={{ cursor: "pointer", color: "#fff", background: "rgba(255,255,255,.1)", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>✕ {tt("Close", "إغلاق")}</button>
            </div>

            {/* Video stage */}
            <div style={{ position: "relative", background: "#000", flex: 1, minHeight: 320, maxHeight: "70vh", display: "flex", alignItems: "flex-start", justifyContent: "center", overflow: "auto" }}>
              <div ref={mountRef} style={{ width: "100%", overflow: "hidden", background: "#fff" }} />
              {/* Big center play overlay (when paused) */}
              {!playLoading && !err && !playing ? (
                <button onClick={toggle} aria-label="play" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.30)", border: "none", cursor: "pointer" }}>
                  <span style={{ width: 78, height: 78, borderRadius: "50%", background: "rgba(20,20,28,.72)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 28px rgba(0,0,0,.55)" }}>
                    <span style={{ color: "#fff", fontSize: 32, marginInlineStart: 5 }}>▶</span>
                  </span>
                </button>
              ) : null}
              {/* Loading spinner */}
              {playLoading ? (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                  <span style={{ width: 38, height: 38, borderRadius: "50%", border: "3px solid rgba(255,255,255,.25)", borderTopColor: "#fff", display: "inline-block", animation: "atr-spin .8s linear infinite" }} />
                  <span style={{ fontSize: 13, color: "#cfd2d8" }}>{tt("Loading session…", "جارٍ تحميل الجلسة…")}</span>
                </div>
              ) : null}
              {err && !playLoading ? (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fda4af", fontSize: 14, padding: 24, textAlign: "center" }}>{err}</div>
              ) : null}
            </div>

            {/* Control bar */}
            <div style={{ background: "#0b0b0f", borderTop: "1px solid rgba(255,255,255,.08)", padding: "10px 16px 14px" }}>
              {/* Seek bar with knob */}
              <div onClick={seek} style={{ height: 10, borderRadius: 6, background: "rgba(255,255,255,.16)", cursor: "pointer", position: "relative", marginBottom: 10 }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.round(progress * 100)}%`, background: "linear-gradient(90deg,#3b82f6,#60a5fa)", borderRadius: 6 }} />
                <div style={{ position: "absolute", left: `calc(${Math.round(progress * 100)}% - 7px)`, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.5)" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={toggle} style={{ cursor: "pointer", width: 42, height: 42, borderRadius: "50%", background: "#3b82f6", border: "none", color: "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{playing ? "⏸" : "▶"}</button>
                <button onClick={restart} title={tt("Restart", "إعادة")} style={{ cursor: "pointer", width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,.1)", border: "none", color: "#fff", fontSize: 15, flexShrink: 0 }}>⟲</button>
                {/* Prominent time counter */}
                <span style={{ color: "#fff", fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums", minWidth: 116, letterSpacing: ".3px" }}>
                  {clock(curMs)} <span style={{ color: "#7c818b", fontWeight: 600 }}>/ {clock(totalRef.current)}</span>
                </span>
                <div style={{ flex: 1 }} />
                <span style={{ color: "#7c818b", fontSize: 12, marginInlineEnd: 2 }}>{tt("Speed", "السرعة")}</span>
                {[1, 2, 4, 8].map((s) => (
                  <button key={s} onClick={() => setSpd(s)} style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, padding: "6px 11px", borderRadius: 8, border: "none", background: speed === s ? "#3b82f6" : "rgba(255,255,255,.1)", color: "#fff", flexShrink: 0 }}>{s}×</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Container>
  )
}

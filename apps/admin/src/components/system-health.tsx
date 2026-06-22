import { useEffect, useState } from "react"
import { Heading, Text, Badge } from "@medusajs/ui"
import { API } from "../lib/api"

type Proc = { name: string; status: string; cpu: number; memory: number; restarts: number; uptime: number }
type Health = {
  cpu: { cores: number; load1: number; pct: number }
  memory: { total: number; used: number; pct: number }
  disk: { total: number; used: number; pct: number }
  uptime_sec: number
  hostname: string
  platform: string
  node: string
  processes: Proc[]
  fetched_at: string
}

const gb = (b: number) => (b / 1024 / 1024 / 1024).toFixed(1) + " GB"
const mb = (b: number) => Math.round(b / 1024 / 1024) + " MB"
const dur = (s: number) => {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
}
const barColor = (pct: number) => (pct >= 90 ? "#dc2626" : pct >= 70 ? "#d97706" : "#16a34a")

function Meter({ label, pct, sub }: { label: string; pct: number; sub: string }) {
  return (
    <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ui-fg-muted">{label}</span>
        <span className="text-sm font-bold tabular-nums" style={{ color: barColor(pct) }}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-ui-bg-subtle overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: barColor(pct) }} />
      </div>
      <div className="text-xs text-ui-fg-muted mt-1.5 tabular-nums">{sub}</div>
    </div>
  )
}

export function SystemHealth() {
  const [h, setH] = useState<Health | null>(null)
  const [err, setErr] = useState(false)

  const load = () => {
    fetch(`${API}/admin/system-health`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject())).then(setH).then(() => setErr(false)).catch(() => setErr(true))
  }
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t) }, [])

  return (
    <div className="rounded-xl border border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest overflow-hidden">
      <div className="px-5 py-4 border-b border-ui-border-base flex items-center justify-between">
        <div>
          <Heading level="h2" className="text-base font-semibold flex items-center gap-2">🖥️ Server Health</Heading>
          {h && <Text size="small" className="text-ui-fg-subtle">{h.hostname} · {h.platform} · Node {h.node} · up {dur(h.uptime_sec)}</Text>}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live · 8s
        </span>
      </div>
      <div className="p-5">
        {err && !h ? (
          <Text className="text-ui-fg-muted">Server metrics unavailable.</Text>
        ) : !h ? (
          <Text className="text-ui-fg-muted">Loading server metrics…</Text>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Meter label="CPU" pct={h.cpu.pct} sub={`${h.cpu.cores} cores · load ${h.cpu.load1.toFixed(2)}`} />
              <Meter label="Memory" pct={h.memory.pct} sub={`${gb(h.memory.used)} / ${gb(h.memory.total)}`} />
              <Meter label="Disk" pct={h.disk.pct} sub={`${gb(h.disk.used)} / ${gb(h.disk.total)}`} />
            </div>
            {h.processes.length > 0 && (
              <div className="mt-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-ui-fg-muted mb-2">Processes</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {h.processes.map((p, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-ui-border-base px-3 py-2 text-sm">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.status === "online" ? "#16a34a" : "#dc2626" }} />
                        <span className="font-medium truncate">{p.name}</span>
                      </span>
                      <span className="flex items-center gap-3 shrink-0 text-xs text-ui-fg-subtle tabular-nums">
                        <span>{p.cpu}%</span>
                        <span>{mb(p.memory)}</span>
                        <span title="restarts">↻{p.restarts}</span>
                        <span>{dur(Math.floor(p.uptime / 1000))}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

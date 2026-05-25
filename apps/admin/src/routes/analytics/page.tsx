import { useEffect, useMemo, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Select, Input, Button } from "@medusajs/ui"
import { ChartBar, ArrowDownTray, GlobeEurope } from "@medusajs/icons"
import { CountryList, HeatmapChart, DeviceBreakdown } from "../../components/geo-widgets"

export const config: RouteConfig = { label: "Analytics", icon: ChartBar }

const API = "https://api.autotorental.com"

type Metric = "all" | "call" | "whatsapp" | "webrtc" | "view"
type VendorStat = { seller_id: string; seller_name: string; seller_handle: string | null; total: number; call: number; whatsapp: number; webrtc: number; view: number }
type Stats = { period: { from: string; to: string }; totals: { call: number; whatsapp: number; webrtc: number; view: number }; by_vendor: VendorStat[]; top_products: Array<{ product_id: string; product_title?: string; seller_id: string; seller_name?: string; event_type: string; count: string }> }
type Series = Array<{ date: string; call: number; whatsapp: number; webrtc: number; view: number; follow?: number }>

const METRICS: Array<{ key: Metric; label: string; icon: string; color: string; bgGrad: string }> = [
  { key: "all",      label: "Total",         icon: "📊", color: "#475569", bgGrad: "linear-gradient(135deg,#475569,#1e293b)" },
  { key: "call",     label: "Phone Calls",   icon: "📞", color: "#10b981", bgGrad: "linear-gradient(135deg,#10b981,#047857)" },
  { key: "whatsapp", label: "WhatsApp",      icon: "💬", color: "#25d366", bgGrad: "linear-gradient(135deg,#25d366,#128c40)" },
  { key: "webrtc",   label: "Free Int'l",    icon: "🌍", color: "#f59e0b", bgGrad: "linear-gradient(135deg,#f59e0b,#b45309)" },
  { key: "view",     label: "Views",         icon: "👁️", color: "#1753b0", bgGrad: "linear-gradient(135deg,#1753b0,#0e3060)" },
]

const RANGE_PRESETS = [
  { id: "7", label: "Last 7 days" },
  { id: "30", label: "Last 30 days" },
  { id: "90", label: "Last 90 days" },
  { id: "180", label: "Last 6 months" },
  { id: "365", label: "Last 12 months" },
  { id: "custom", label: "Custom range" },
]

// --- Chart components ---
function AnalyticsHero({ series, totals, loading, label }: {
  series: Series; totals: { call: number; whatsapp: number; webrtc: number; view: number }; loading: boolean; label: string
}) {
  const grand = totals.call + totals.whatsapp + totals.webrtc + totals.view
  // Growth % — first half vs second half of the series
  const half = Math.max(1, Math.floor(series.length / 2))
  const firstHalf = series.slice(0, half).reduce((a, b) => a + b.call + b.whatsapp + b.webrtc + b.view, 0)
  const secondHalf = series.slice(half).reduce((a, b) => a + b.call + b.whatsapp + b.webrtc + b.view, 0)
  const growth = firstHalf > 0 ? Math.round((secondHalf / firstHalf - 1) * 100) : (secondHalf > 0 ? 100 : 0)
  const growthPositive = growth >= 0

  // Sparkline path for total
  const sparkW = 1200, sparkH = 90, sparkPad = 6
  const totalsByDay = series.map(b => b.call + b.whatsapp + b.webrtc + b.view)
  const max = Math.max(1, ...totalsByDay)
  const stepX = (sparkW - sparkPad * 2) / Math.max(1, totalsByDay.length - 1)
  const sparkPts = totalsByDay.map((v, i) => [sparkPad + i * stepX, sparkPad + (sparkH - sparkPad * 2) - (v / max) * (sparkH - sparkPad * 2)])
  const sparkPath = sparkPts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]},${p[1]}`).join(" ")
  const sparkArea = `${sparkPath} L ${sparkPts.length ? sparkPts[sparkPts.length-1][0] : sparkPad},${sparkH - sparkPad} L ${sparkPad},${sparkH - sparkPad} Z`

  const miniMetrics: Array<{ label: string; emoji: string; key: keyof typeof totals; color: string }> = [
    { label: "Calls",    emoji: "\u{1F4DE}", key: "call",     color: "#10b981" },
    { label: "WhatsApp", emoji: "\u{1F4AC}", key: "whatsapp", color: "#25d366" },
    { label: "Free Int'l", emoji: "\u{1F310}", key: "webrtc", color: "#f59e0b" },
    { label: "Views",    emoji: "\u{1F441}️",  key: "view",     color: "#1753b0" },
  ]

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-xl" style={{ background: "linear-gradient(135deg,#0f1729 0%,#1e3a8a 50%,#1753b0 100%)" }}>
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 10% 10%, white 1px, transparent 1px), radial-gradient(circle at 50% 80%, white 1px, transparent 1px)", backgroundSize: "60px 60px" }}/>
      <div className="relative px-6 md:px-8 py-7">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-white/70 font-bold">{label}</div>
            <div className="flex items-baseline gap-3 mt-1.5 flex-wrap">
              <span className="text-4xl md:text-6xl font-black text-white tabular-nums">{loading ? "—" : grand.toLocaleString()}</span>
              <span className="text-white/85 text-base md:text-lg font-medium">total events</span>
              {!loading && series.length >= 4 && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${growthPositive ? "bg-emerald-400/20 text-emerald-300" : "bg-red-400/20 text-red-300"}`}>
                  {growthPositive ? "↗" : "↘"} {Math.abs(growth)}% vs first half
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            {miniMetrics.map(m => (
              <div key={m.key} className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-3 py-2 min-w-[100px]">
                <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold">{m.emoji} {m.label}</div>
                <div className="text-xl font-black text-white tabular-nums mt-0.5">{(totals[m.key] || 0).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sparkline */}
        {series.length > 1 && !loading && (
          <div className="mt-5">
            <svg viewBox={`0 0 ${sparkW} ${sparkH}`} className="w-full h-20 md:h-24" preserveAspectRatio="none">
              <defs>
                <linearGradient id="hero-spark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.6"/>
                  <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d={sparkArea} fill="url(#hero-spark)"/>
              <path d={sparkPath} stroke="#7dd3fc" strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
              {sparkPts.length > 0 && (
                <circle cx={sparkPts[sparkPts.length-1][0]} cy={sparkPts[sparkPts.length-1][1]} r="5" fill="#fff" stroke="#7dd3fc" strokeWidth="2"/>
              )}
            </svg>
            <div className="flex justify-between text-[10px] text-white/60 mt-1">
              <span>{series[0]?.date.slice(5)}</span>
              <span>{series[series.length - 1]?.date.slice(5)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


function LineChart({ series, metric }: { series: Series; metric: Metric }) {
  const w = 1000, h = 240, pad = 36
  const innerW = w - pad * 2, innerH = h - pad * 2
  const vals = series.map(b => metric === "all" ? b.call + b.whatsapp + b.webrtc + b.view : (b as any)[metric] || 0)
  const max = Math.max(1, ...vals)
  const stepX = innerW / Math.max(1, series.length - 1)
  const pts = vals.map((v, i) => [pad + i * stepX, pad + innerH - (v / max) * innerH])
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]},${p[1]}`).join(" ")
  const area = `${path} L ${pad + (series.length - 1) * stepX},${pad + innerH} L ${pad},${pad + innerH} Z`
  const color = METRICS.find(m => m.key === metric)?.color || "#1753b0"

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-56 md:h-72" preserveAspectRatio="none">
      <defs>
        <linearGradient id="adm-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75].map((t, i) => (
        <line key={i} x1={pad} x2={w - pad} y1={pad + innerH * t} y2={pad + innerH * t} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 4"/>
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <text key={`y${i}`} x={pad - 8} y={pad + innerH * t + 4} fontSize="10" fill="#9ca3af" textAnchor="end">{Math.round(max * (1 - t))}</text>
      ))}
      <path d={area} fill="url(#adm-area)"/>
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
      {pts.map((p, i) => vals[i] > 0 && (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="white" stroke={color} strokeWidth="2"/>
      ))}
      {series.length > 0 && series.map((b, i) => {
        const every = Math.max(1, Math.floor(series.length / 10))
        if (i % every !== 0 && i !== series.length - 1) return null
        return <text key={`x${i}`} x={pad + i * stepX} y={h - 8} fontSize="9" fill="#9ca3af" textAnchor="middle">{b.date.slice(5)}</text>
      })}
    </svg>
  )
}

function StackedBar({ series }: { series: Series }) {
  const w = 1000, h = 220, pad = 36
  const innerW = w - pad * 2, innerH = h - pad * 2
  const barW = Math.max(2, innerW / series.length - 2)
  const totals = series.map(b => b.call + b.whatsapp + b.webrtc + b.view)
  const max = Math.max(1, ...totals)
  const colors = { call: "#10b981", whatsapp: "#25d366", webrtc: "#f59e0b", view: "#1753b0" }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-52" preserveAspectRatio="none">
      {series.map((b, i) => {
        const x = pad + i * (barW + 2)
        let y = pad + innerH
        return (
          <g key={i}>
            {(["view", "webrtc", "whatsapp", "call"] as const).map(k => {
              const v = (b as any)[k] || 0
              const hgt = (v / max) * innerH
              y -= hgt
              return <rect key={k} x={x} y={y} width={barW} height={hgt} fill={(colors as any)[k]} opacity="0.95"/>
            })}
            {/* reset y because of g */}
          </g>
        )
      })}
      {series.length > 0 && series.map((b, i) => {
        const every = Math.max(1, Math.floor(series.length / 10))
        if (i % every !== 0 && i !== series.length - 1) return null
        return <text key={`xb${i}`} x={pad + i * (barW + 2) + barW / 2} y={h - 6} fontSize="9" fill="#9ca3af" textAnchor="middle">{b.date.slice(5)}</text>
      })}
    </svg>
  )
}

const Page = () => {
  const [stats, setStats] = useState<Stats | null>(null)
  const [series, setSeries] = useState<Series>([])
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState<Metric>("all")
  const [rangeId, setRangeId] = useState("30")
  const [from, setFrom] = useState<string>(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
  const [to, setTo] = useState<string>(new Date().toISOString().slice(0, 10))
  const [chartType, setChartType] = useState<"line" | "bar">("line")
  const [sellerFilter, setSellerFilter] = useState<string>("")
  const [eventFilter, setEventFilter] = useState<Metric>("all")
  const [sellersList, setSellersList] = useState<Array<{ id: string; name: string }>>([])
  const [geo, setGeo] = useState<any>(null)

  // Update from/to when range preset changes
  useEffect(() => {
    if (rangeId === "custom") return
    const days = parseInt(rangeId, 10)
    setFrom(new Date(Date.now() - days * 86400000).toISOString().slice(0, 10))
    setTo(new Date().toISOString().slice(0, 10))
  }, [rangeId])

  // Fetch sellers for filter dropdown
  useEffect(() => {
    fetch(`${API}/admin/sellers?limit=500`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null).then(d => d?.sellers && setSellersList(d.sellers.map((s: any) => ({ id: s.id, name: s.name }))))
      .catch(() => {})
  }, [])

  // Fetch data when filters change
  useEffect(() => {
    setLoading(true)
    const qs = new URLSearchParams()
    qs.set("from", from); qs.set("to", to)
    if (sellerFilter) qs.set("seller_id", sellerFilter)
    if (eventFilter !== "all") qs.set("event_type", eventFilter)
    Promise.all([
      fetch(`${API}/admin/analytics/contacts?${qs}`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
      fetch(`${API}/admin/analytics/timeseries?${qs}`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
      fetch(`${API}/admin/analytics/geography?days=${Math.ceil((Date.parse(to) - Date.parse(from)) / 86400000) || 30}${sellerFilter ? `&seller_id=${sellerFilter}` : ""}`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
    ]).then(([s, t, g]) => { setStats(s); setSeries(t?.series || []); setGeo(g) }).finally(() => setLoading(false))
  }, [from, to, sellerFilter, eventFilter])

  const totals = stats?.totals || { call: 0, whatsapp: 0, webrtc: 0, view: 0 }
  const grandTotal = totals.call + totals.whatsapp + totals.webrtc + totals.view
  const valOf = (k: Metric) => k === "all" ? grandTotal : (totals as any)[k] || 0

  const filteredVendors = useMemo(() => {
    if (!stats) return []
    return [...stats.by_vendor].sort((a, b) => {
      const va = metric === "all" ? a.total : (a as any)[metric]
      const vb = metric === "all" ? b.total : (b as any)[metric]
      return vb - va
    })
  }, [stats, metric])

  const exportCsv = () => {
    if (!stats) return
    const rows = [
      ["Rental Company", "Handle", "Phone Calls", "WhatsApp", "Free Int'l", "Views", "Total"],
      ...filteredVendors.map(v => [v.seller_name, v.seller_handle || "", v.call, v.whatsapp, v.webrtc, v.view, v.total]),
    ]
    const csv = rows.map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `analytics-${from}_to_${to}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <Heading level="h2" className="text-2xl">📈 Analytics</Heading>
            <Text className="text-ui-fg-subtle">Customer contact events across all rental companies.</Text>
          </div>
          <Button variant="secondary" onClick={exportCsv} disabled={!stats}><ArrowDownTray /> Export CSV</Button>
        </div>
      </Container>

      {/* Advanced filters bar */}
      <Container className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-ui-fg-muted font-bold mb-1 block">Range</label>
            <Select value={rangeId} onValueChange={setRangeId}>
              <Select.Trigger><Select.Value /></Select.Trigger>
              <Select.Content>{RANGE_PRESETS.map(r => <Select.Item key={r.id} value={r.id}>{r.label}</Select.Item>)}</Select.Content>
            </Select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-ui-fg-muted font-bold mb-1 block">From</label>
            <Input type="date" value={from} onChange={e => { setRangeId("custom"); setFrom(e.target.value) }}/>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-ui-fg-muted font-bold mb-1 block">To</label>
            <Input type="date" value={to} onChange={e => { setRangeId("custom"); setTo(e.target.value) }}/>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-ui-fg-muted font-bold mb-1 block">Rental Company</label>
            <Select value={sellerFilter || "_all"} onValueChange={v => setSellerFilter(v === "_all" ? "" : v)}>
              <Select.Trigger><Select.Value placeholder="All companies"/></Select.Trigger>
              <Select.Content>
                <Select.Item value="_all">All companies</Select.Item>
                {sellersList.map(s => <Select.Item key={s.id} value={s.id}>{s.name}</Select.Item>)}
              </Select.Content>
            </Select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-ui-fg-muted font-bold mb-1 block">Event Type</label>
            <Select value={eventFilter} onValueChange={v => setEventFilter(v as Metric)}>
              <Select.Trigger><Select.Value/></Select.Trigger>
              <Select.Content>
                <Select.Item value="all">All events</Select.Item>
                <Select.Item value="call">📞 Phone calls</Select.Item>
                <Select.Item value="whatsapp">💬 WhatsApp</Select.Item>
                <Select.Item value="webrtc">🌍 Free Int'l calls</Select.Item>
                <Select.Item value="view">👁️ Views</Select.Item>
              </Select.Content>
            </Select>
          </div>
        </div>
      </Container>

      {/* HERO KPI block — big chart at the top */}
      <Container className="p-0 bg-transparent shadow-none border-0">
        <AnalyticsHero
          series={series}
          totals={stats?.totals || { call: 0, whatsapp: 0, webrtc: 0, view: 0 }}
          loading={loading}
          label={RANGE_PRESETS.find(r => r.id === rangeId)?.label || "Selected range"}
        />
      </Container>

      {/* Metric cards */}
      <Container className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {METRICS.map(m => {
            const v = valOf(m.key)
            const isActive = metric === m.key
            const pct = grandTotal > 0 && m.key !== "all" ? Math.round((v / grandTotal) * 100) : null
            return (
              <button key={m.key} onClick={() => setMetric(m.key)}
                className={`text-left rounded-xl p-4 transition-all border-2 ${isActive ? "border-transparent text-white shadow-lg" : "bg-white border-ui-border-base hover:border-ui-fg-muted"}`}
                style={isActive ? { background: m.bgGrad } : {}}>
                <div className="flex items-center justify-between">
                  <span className="text-xl">{m.icon}</span>
                  {pct !== null && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isActive ? "bg-white/20 text-white" : "bg-ui-bg-subtle text-ui-fg-subtle"}`}>{pct}%</span>}
                </div>
                <div className={`text-2xl md:text-3xl font-bold mt-2 ${isActive ? "text-white" : "text-ui-fg-base"}`}>{v.toLocaleString()}</div>
                <div className={`text-[11px] mt-0.5 ${isActive ? "text-white/85" : "text-ui-fg-subtle"}`}>{m.label}</div>
              </button>
            )
          })}
        </div>
      </Container>

      {/* Big chart */}
      <Container className="p-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div>
            <Heading level="h3">{METRICS.find(m => m.key === metric)?.label} over time</Heading>
            <Text size="small" className="text-ui-fg-subtle">Daily breakdown for selected filters</Text>
          </div>
          <div className="flex items-center gap-1 bg-ui-bg-subtle rounded-lg p-1">
            <button onClick={() => setChartType("line")} className={`px-3 py-1.5 text-xs font-semibold rounded ${chartType === "line" ? "bg-white shadow-sm" : "text-ui-fg-muted"}`}>📈 Line</button>
            <button onClick={() => setChartType("bar")} className={`px-3 py-1.5 text-xs font-semibold rounded ${chartType === "bar" ? "bg-white shadow-sm" : "text-ui-fg-muted"}`}>📊 Stacked Bar</button>
          </div>
        </div>
        {loading ? <div className="bg-ui-bg-subtle rounded-lg p-12 text-center text-ui-fg-muted">Loading…</div>
         : series.length === 0 ? <div className="bg-ui-bg-subtle rounded-lg p-12 text-center text-ui-fg-muted">No data for this range</div>
         : chartType === "line" ? <LineChart series={series} metric={metric}/> : <StackedBar series={series}/>}
        {chartType === "bar" && (
          <div className="flex flex-wrap gap-3 justify-center mt-3 text-xs">
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 inline-block rounded-sm" style={{background:"#10b981"}}/> Calls</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 inline-block rounded-sm" style={{background:"#25d366"}}/> WhatsApp</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 inline-block rounded-sm" style={{background:"#f59e0b"}}/> Free Call</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 inline-block rounded-sm" style={{background:"#1753b0"}}/> Views</span>
          </div>
        )}
      </Container>

      {/* Per-company table */}
      <Container className="p-0">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <Heading level="h3">Rental Companies — {METRICS.find(m => m.key === metric)?.label}</Heading>
              <Text size="small" className="text-ui-fg-subtle">{filteredVendors.length} companies · sorted by selected metric</Text>
            </div>
          </div>
        </div>
        {loading ? <div className="p-12 text-center text-ui-fg-muted">Loading…</div>
         : filteredVendors.length === 0 ? <div className="p-12 text-center text-ui-fg-muted">No data yet.</div>
         : (
          <Table>
            <Table.Header><Table.Row>
              <Table.HeaderCell>#</Table.HeaderCell>
              <Table.HeaderCell>Rental Company</Table.HeaderCell>
              <Table.HeaderCell>📞 Calls</Table.HeaderCell>
              <Table.HeaderCell>💬 WhatsApp</Table.HeaderCell>
              <Table.HeaderCell>🌍 Free</Table.HeaderCell>
              <Table.HeaderCell>👁️ Views</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Total</Table.HeaderCell>
            </Table.Row></Table.Header>
            <Table.Body>
              {filteredVendors.map((v, i) => {
                const max = Math.max(...filteredVendors.map(x => metric === "all" ? x.total : (x as any)[metric]))
                const cur = metric === "all" ? v.total : (v as any)[metric]
                const pct = max > 0 ? (cur / max) * 100 : 0
                return (
                  <Table.Row key={v.seller_id}>
                    <Table.Cell className="text-ui-fg-muted">{i + 1}</Table.Cell>
                    <Table.Cell><div className="font-medium">{v.seller_name}</div><div className="text-[11px] text-ui-fg-muted">{v.seller_handle}</div></Table.Cell>
                    <Table.Cell className="tabular-nums">{(v.call || 0).toLocaleString()}</Table.Cell>
                    <Table.Cell className="tabular-nums">{(v.whatsapp || 0).toLocaleString()}</Table.Cell>
                    <Table.Cell className="tabular-nums">{(v.webrtc || 0).toLocaleString()}</Table.Cell>
                    <Table.Cell className="tabular-nums">{(v.view || 0).toLocaleString()}</Table.Cell>
                    <Table.Cell className="text-right">
                      <div className="flex items-center justify-end gap-2 min-w-[140px]">
                        <div className="flex-1 h-2 bg-ui-bg-subtle rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-blue-700" style={{ width: `${pct}%` }}/>
                        </div>
                        <span className="font-bold tabular-nums">{v.total.toLocaleString()}</span>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table>
        )}
      </Container>

      {/* Geography + Heatmap + Devices */}
      <Container className="p-6">
        <Heading level="h3" className="flex items-center gap-2"><GlobeEurope /> Visitor Geography</Heading>
        <Text size="small" className="text-ui-fg-subtle mb-4">Top countries by event count. Detected from IP via GeoLite2.</Text>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CountryList data={geo?.countries || []}/>
          <div>
            <Text size="small" className="text-ui-fg-subtle mb-2 block">Device Type</Text>
            <DeviceBreakdown data={geo?.devices || []}/>
          </div>
        </div>
      </Container>

      <Container className="p-6">
        <Heading level="h3">🕒 Activity Heatmap</Heading>
        <Text size="small" className="text-ui-fg-subtle mb-4">When customers actually contact rental companies. UAE timezone (UTC+4). Use this to schedule ads + check inbox staffing.</Text>
        <HeatmapChart data={geo?.heatmap || []}/>
      </Container>

      {/* Top vehicles */}
      {stats?.top_products && stats.top_products.length > 0 && (
        <Container className="p-0">
          <div className="p-6 border-b">
            <Heading level="h3">🔥 Top Vehicles</Heading>
            <Text size="small" className="text-ui-fg-subtle">Most-contacted in this range</Text>
          </div>
          <Table>
            <Table.Header><Table.Row>
              <Table.HeaderCell>#</Table.HeaderCell>
              <Table.HeaderCell>Vehicle</Table.HeaderCell>
              <Table.HeaderCell>Rental Company</Table.HeaderCell>
              <Table.HeaderCell>Event</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Count</Table.HeaderCell>
            </Table.Row></Table.Header>
            <Table.Body>
              {stats.top_products.slice(0, 15).map((p, i) => (
                <Table.Row key={`${p.product_id}-${p.event_type}`}>
                  <Table.Cell className="text-ui-fg-muted">{i + 1}</Table.Cell>
                  <Table.Cell><div className="font-medium">{p.product_title || p.product_id}</div></Table.Cell>
                  <Table.Cell><Text size="small">{p.seller_name || "—"}</Text></Table.Cell>
                  <Table.Cell><Badge color={p.event_type === "whatsapp" ? "green" : p.event_type === "call" ? "blue" : p.event_type === "webrtc" ? "orange" : "grey"}>{p.event_type}</Badge></Table.Cell>
                  <Table.Cell className="text-right font-bold tabular-nums">{p.count}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Container>
      )}
    </SingleColumnPage>
  )
}

export default Page

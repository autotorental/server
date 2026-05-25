import { useEffect, useMemo, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Select, Button } from "@medusajs/ui"
import { ChartBar, GlobeEurope, ArrowUpRightOnBox, Bolt } from "@medusajs/icons"
import { CountryList, HeatmapChart, DeviceBreakdown } from "../../components/geo-widgets"

export const config: RouteConfig = { label: "Analytics", icon: ChartBar }

const API = "https://api.autotorental.com"

type Bucket = { date: string; call: number; whatsapp: number; webrtc: number; view: number; follow: number }
type Timeseries = { series: Bucket[]; total: Bucket; days: number }
type Stats = {
  seller_id: string
  totals: { call: number; whatsapp: number; webrtc: number; view: number }
  top_products: Array<{ product_id: string; event_type: string; count: string; product_title?: string }>
}

type Metric = "all" | "call" | "whatsapp" | "webrtc" | "view"

const METRICS: Array<{ key: Metric; label: string; icon: string; tint: string; gradient: string; ring: string; accent: string }> = [
  { key: "all", label: "Total Activity", icon: "📊", tint: "bg-slate-50 dark:bg-slate-900/40", gradient: "from-slate-700 to-slate-900", ring: "ring-slate-500/30", accent: "#475569" },
  { key: "call", label: "Phone Calls", icon: "📞", tint: "bg-emerald-50 dark:bg-emerald-900/30", gradient: "from-emerald-500 to-emerald-700", ring: "ring-emerald-500/40", accent: "#10b981" },
  { key: "whatsapp", label: "WhatsApp", icon: "💬", tint: "bg-green-50 dark:bg-green-900/30", gradient: "from-[#25D366] to-[#128c40]", ring: "ring-green-500/40", accent: "#25d366" },
  { key: "webrtc", label: "Free Int'l Calls", icon: "🌍", tint: "bg-amber-50 dark:bg-amber-900/30", gradient: "from-amber-500 to-orange-600", ring: "ring-amber-500/40", accent: "#f59e0b" },
  { key: "view", label: "Page Views", icon: "👁️", tint: "bg-blue-50 dark:bg-blue-900/30", gradient: "from-blue-500 to-blue-700", ring: "ring-blue-500/40", accent: "#1753b0" },
]

const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
]

function LineChart({ series, metric }: { series: Bucket[]; metric: Metric }) {
  const w = 1000, h = 240, pad = 36
  const innerW = w - pad * 2, innerH = h - pad * 2
  const vals = series.map(b => metric === "all" ? b.call + b.whatsapp + b.webrtc + b.view : (b as any)[metric] || 0)
  const max = Math.max(1, ...vals)
  const stepX = innerW / Math.max(1, series.length - 1)
  const pts = vals.map((v, i) => [pad + i * stepX, pad + innerH - (v / max) * innerH])
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]},${p[1]}`).join(" ")
  const area = `${path} L ${pad + (series.length - 1) * stepX},${pad + innerH} L ${pad},${pad + innerH} Z`
  const color = METRICS.find(m => m.key === metric)?.accent || "#1753b0"
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-56" preserveAspectRatio="none">
      <defs>
        <linearGradient id="v-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75].map((t, i) => (
        <line key={i} x1={pad} x2={w - pad} y1={pad + innerH * t} y2={pad + innerH * t} stroke="#e5e7eb" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="3 4"/>
      ))}
      <path d={area} fill="url(#v-area)"/>
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
      {pts.map((p, i) => vals[i] > 0 && <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="white" stroke={color} strokeWidth="2"/>)}
      {series.length > 0 && series.map((b, i) => {
        const every = Math.max(1, Math.floor(series.length / 8))
        if (i % every !== 0 && i !== series.length - 1) return null
        return <text key={`x${i}`} x={pad + i * stepX} y={h - 6} fontSize="9" fill="#9ca3af" textAnchor="middle">{b.date.slice(5)}</text>
      })}
    </svg>
  )
}

function Spark({ data, color }: { data: number[]; color: string }) {
  const w = 80, h = 24
  if (!data.length) return null
  const max = Math.max(1, ...data)
  const stepX = w / Math.max(1, data.length - 1)
  const pts = data.map((v, i) => [i * stepX, h - (v / max) * h]).map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]},${p[1]}`).join(" ")
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-6 max-w-[80px]">
      <path d={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity="0.9"/>
    </svg>
  )
}

const Page = () => {
  const [stats, setStats] = useState<Stats | null>(null)
  const [ts, setTs] = useState<Timeseries | null>(null)
  const [geo, setGeo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState<Metric>("all")
  const [range, setRange] = useState("30")
  const [eventFilter, setEventFilter] = useState<Metric>("all")

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`${API}/vendor/analytics/contacts?days=${range}${eventFilter !== "all" ? `&event_type=${eventFilter}` : ""}`, { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API}/vendor/analytics/timeseries?days=${range}${eventFilter !== "all" ? `&event_type=${eventFilter}` : ""}`, { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API}/vendor/analytics/geography?days=${range}`, { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([s, t, g]) => { setStats(s); setTs(t); setGeo(g) }).finally(() => setLoading(false))
  }, [range, eventFilter])

  const totals = stats?.totals || { call: 0, whatsapp: 0, webrtc: 0, view: 0 }
  const grand = totals.call + totals.whatsapp + totals.webrtc + totals.view
  const valOf = (k: Metric) => k === "all" ? grand : (totals as any)[k] || 0

  const sparkData = (k: Exclude<Metric, "all">) => (ts?.series || []).map(b => b[k])
  const allSpark = (ts?.series || []).map(b => b.call + b.whatsapp + b.webrtc + b.view)
  const isEmpty = grand === 0

  return (
    <SingleColumnPage>
      {/* Hero header */}
      <Container className="p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-ui-fg-muted font-bold mb-1">Vendor Insights</div>
            <Heading level="h2" className="text-2xl flex items-center gap-2">📈 Your Analytics</Heading>
            <Text className="text-ui-fg-subtle text-sm">How customers reach you — and which vehicles drive the most interest.</Text>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={range} onValueChange={setRange}>
              <Select.Trigger className="w-36"><Select.Value/></Select.Trigger>
              <Select.Content>{RANGES.map(r => <Select.Item key={r.value} value={r.value}>{r.label}</Select.Item>)}</Select.Content>
            </Select>
            <Select value={eventFilter} onValueChange={v => setEventFilter(v as Metric)}>
              <Select.Trigger className="w-40"><Select.Value/></Select.Trigger>
              <Select.Content>
                <Select.Item value="all">All events</Select.Item>
                <Select.Item value="call">📞 Phone calls</Select.Item>
                <Select.Item value="whatsapp">💬 WhatsApp</Select.Item>
                <Select.Item value="webrtc">🌍 Free Int'l</Select.Item>
                <Select.Item value="view">👁️ Views</Select.Item>
              </Select.Content>
            </Select>
          </div>
        </div>
      </Container>

      {/* HERO METRIC CARDS — gradient + sparkline + better hierarchy */}
      <Container className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {METRICS.map(m => {
            const v = valOf(m.key)
            const isActive = metric === m.key
            const sparkValues = m.key === "all" ? allSpark : sparkData(m.key as any)
            const pct = grand > 0 && m.key !== "all" ? Math.round((v / grand) * 100) : null
            return (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={`group relative text-left rounded-2xl p-4 transition-all border-2 overflow-hidden ${
                  isActive
                    ? `border-transparent text-white shadow-2xl scale-[1.02] ring-2 ${m.ring}`
                    : `border-transparent ${m.tint} hover:scale-[1.01] hover:shadow-lg`
                }`}
                style={isActive ? { background: `linear-gradient(135deg, var(--tw-gradient-stops))`, backgroundImage: `linear-gradient(135deg, ${m.accent}, ${m.accent}cc)` } : {}}
              >
                {/* decorative circle */}
                <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${isActive ? "bg-white/10" : ""}`}/>
                <div className="relative flex items-start justify-between mb-3">
                  <div className={`text-3xl ${isActive ? "opacity-90" : ""}`}>{m.icon}</div>
                  {pct !== null && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? "bg-white/25 text-white" : "bg-white/70 dark:bg-black/30 text-ui-fg-base"}`}>
                      {pct}%
                    </span>
                  )}
                </div>
                <div className={`text-3xl md:text-4xl font-black ${isActive ? "text-white" : "text-ui-fg-base"} tabular-nums leading-none`}>{v.toLocaleString()}</div>
                <div className={`text-[11px] mt-1 font-medium ${isActive ? "text-white/90" : "text-ui-fg-subtle"}`}>{m.label}</div>
                <div className="mt-3 opacity-80">
                  <Spark data={sparkValues} color={isActive ? "rgba(255,255,255,0.95)" : m.accent}/>
                </div>
              </button>
            )
          })}
        </div>
      </Container>

      {/* EMPTY STATE — show actionable onboarding when grand === 0 */}
      {isEmpty && !loading && (
        <Container className="p-6">
          <div className="rounded-2xl overflow-hidden border border-ui-border-base bg-gradient-to-br from-ui-tag-blue-bg to-ui-bg-base p-8">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="text-5xl">🚀</div>
              <div className="flex-1 min-w-[260px]">
                <Heading level="h3">Let's get your first customer event!</Heading>
                <Text className="text-ui-fg-subtle mt-1 mb-4">When customers click WhatsApp, Call, Free Call, or just view your listings — the data appears here in real time.</Text>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {[
                    { icon: "1️⃣", title: "List your cars", desc: "Add vehicles with sharp photos, accurate prices, and a clear description.", cta: "Open Vehicles →", href: "/vehicles" },
                    { icon: "2️⃣", title: "Share your link", desc: "Send your storefront link to past customers, post on social media, run a small ad.", cta: "Open Marketing →", href: "/marketing" },
                    { icon: "3️⃣", title: "Wait for the first ping", desc: "First WhatsApp click or call appears here in seconds. Most new vendors see activity within 48h." },
                    { icon: "4️⃣", title: "Optimize", desc: "Once events come in, this page tells you which countries, devices, times, and vehicles work best." },
                  ].map((c, i) => (
                    <div key={i} className="bg-ui-bg-base border border-ui-border-base rounded-xl p-4">
                      <div className="text-xl mb-1">{c.icon}</div>
                      <div className="font-bold text-ui-fg-base">{c.title}</div>
                      <div className="text-xs text-ui-fg-subtle mt-1 leading-relaxed">{c.desc}</div>
                      {c.cta && <a href={c.href} className="text-xs font-bold text-ui-fg-interactive mt-2 inline-block">{c.cta}</a>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Container>
      )}

      {/* Chart */}
      <Container className="p-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <Heading level="h3">📉 {METRICS.find(m => m.key === metric)?.label} over time</Heading>
            <Text size="small" className="text-ui-fg-subtle">Daily breakdown · last {range} days</Text>
          </div>
          {!isEmpty && <Badge color="blue"><Bolt /> Live</Badge>}
        </div>
        {loading ? (
          <div className="bg-ui-bg-subtle rounded-2xl p-12 text-center text-ui-fg-muted">Loading…</div>
        ) : !ts?.series?.length || allSpark.every(v => v === 0) ? (
          <div className="bg-ui-bg-subtle rounded-2xl p-10 text-center">
            <div className="text-4xl mb-2 opacity-60">📈</div>
            <div className="text-sm text-ui-fg-subtle">No data yet for this period — your chart will fill up as customers contact you.</div>
          </div>
        ) : (
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-4">
            <LineChart series={ts.series} metric={metric}/>
          </div>
        )}
      </Container>

      {/* Geography */}
      <Container className="p-6">
        <Heading level="h3" className="flex items-center gap-2"><GlobeEurope /> Where your customers are</Heading>
        <Text size="small" className="text-ui-fg-subtle mb-4">Top countries by contacts (detected from visitor IP).</Text>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CountryList data={geo?.countries || []}/>
          <div>
            <Text size="small" className="text-ui-fg-subtle mb-2 block font-semibold">Device Type</Text>
            <DeviceBreakdown data={geo?.devices || []}/>
          </div>
        </div>
      </Container>

      {/* Heatmap */}
      <Container className="p-6">
        <Heading level="h3">🕒 Best time to be available</Heading>
        <Text size="small" className="text-ui-fg-subtle mb-4">Activity heatmap (UAE time). Make sure your WhatsApp / phone is staffed during peak hours.</Text>
        <HeatmapChart data={geo?.heatmap || []}/>
      </Container>

      {/* Top Vehicles */}
      <Container className="p-0">
        <div className="p-6 border-b border-ui-border-base">
          <Heading level="h3">🔥 Your Top Vehicles</Heading>
          <Text size="small" className="text-ui-fg-subtle">Most-contacted listings</Text>
        </div>
        {!stats?.top_products?.length ? (
          <div className="p-12 text-center text-ui-fg-muted">
            <div className="text-4xl mb-2 opacity-60">🚗</div>
            <div className="text-sm">No data yet — your top-performing vehicles will appear here.</div>
          </div>
        ) : (
          <Table>
            <Table.Header><Table.Row>
              <Table.HeaderCell>#</Table.HeaderCell>
              <Table.HeaderCell>Vehicle</Table.HeaderCell>
              <Table.HeaderCell>Event</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Count</Table.HeaderCell>
            </Table.Row></Table.Header>
            <Table.Body>
              {stats.top_products.slice(0, 15).map((p, i) => (
                <Table.Row key={`${p.product_id}-${p.event_type}`}>
                  <Table.Cell className="text-ui-fg-muted">{i + 1}</Table.Cell>
                  <Table.Cell><div className="font-medium">{p.product_title || p.product_id}</div></Table.Cell>
                  <Table.Cell><Badge color={p.event_type === "whatsapp" ? "green" : p.event_type === "call" ? "blue" : p.event_type === "webrtc" ? "orange" : "grey"}>{p.event_type}</Badge></Table.Cell>
                  <Table.Cell className="text-right font-bold tabular-nums">{p.count}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </Container>
    </SingleColumnPage>
  )
}

export default Page

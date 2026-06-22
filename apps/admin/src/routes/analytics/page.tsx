import { useEffect, useMemo, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Select, Input, Button } from "@medusajs/ui"
import {
  ChartBar,
  ArrowDownTray,
  GlobeEurope,
  Phone,
  ChatBubbleLeftRight,
  Eye,
  Clock,
  BuildingStorefront,
} from "@medusajs/icons"
import { CountryList, HeatmapChart, DeviceBreakdown } from "../../components/geo-widgets"
import { API } from "../../lib/api"
import { WebsiteTraffic } from "../../components/website-traffic"
import { AllEvents } from "../../components/all-events"

export const config: RouteConfig = { label: tt("Calls & Contacts", "المكالمات وجهات الاتصال"), icon: ChartBar, rank: 21 }

type Metric = "all" | "call" | "whatsapp" | "webrtc" | "view"
type VendorStat = {
  seller_id: string
  seller_name: string
  seller_handle: string | null
  total: number
  call: number
  whatsapp: number
  webrtc: number
  view: number
}
type Stats = {
  period: { from: string; to: string }
  totals: { call: number; whatsapp: number; webrtc: number; view: number }
  by_vendor: VendorStat[]
  top_products: Array<{
    product_id: string
    product_title?: string
    seller_id: string
    seller_name?: string
    event_type: string
    count: string
  }>
}
type Series = Array<{ date: string; call: number; whatsapp: number; webrtc: number; view: number; follow?: number }>

const METRICS: Array<{ key: Metric; label: string; short: string; color: string; accent: string }> = [
  { key: "all", label: "All events", short: "Total", color: "#334155", accent: "bg-ui-bg-subtle" },
  { key: "call", label: "Phone calls", short: "Calls", color: "#059669", accent: "bg-emerald-50 dark:bg-emerald-950/30" },
  { key: "whatsapp", label: "WhatsApp", short: "WhatsApp", color: "#16a34a", accent: "bg-green-50 dark:bg-green-950/30" },
  { key: "webrtc", label: "International calls", short: "Intl.", color: "#d97706", accent: "bg-amber-50 dark:bg-amber-950/30" },
  { key: "view", label: "Listing views", short: "Views", color: "#1753b0", accent: "bg-blue-50 dark:bg-blue-950/30" },
]

const RANGE_PRESETS = [
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
  { id: "180", label: "6 months" },
  { id: "365", label: "12 months" },
  { id: "custom", label: "Custom" },
]

const EVENT_BADGE: Record<string, "green" | "blue" | "orange" | "grey" | "purple"> = {
  whatsapp: "green",
  call: "blue",
  webrtc: "orange",
  view: "grey",
  follow: "purple",
}

function fmtRange(from: string, to: string) {
  try {
    const a = new Date(from + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    const b = new Date(to + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    return `${a} – ${b}`
  } catch {
    return `${from} – ${to}`
  }
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-ui-bg-subtle ${className}`} />
}

function LineChart({ series, metric }: { series: Series; metric: Metric }) {
  const w = 1000
  const h = 260
  const pad = 40
  const innerW = w - pad * 2
  const innerH = h - pad * 2
  const vals = series.map(b => (metric === "all" ? b.call + b.whatsapp + b.webrtc + b.view : (b as any)[metric] || 0))
  const max = Math.max(1, ...vals)
  const stepX = innerW / Math.max(1, series.length - 1)
  const pts = vals.map((v, i) => [pad + i * stepX, pad + innerH - (v / max) * innerH])
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]},${p[1]}`).join(" ")
  const area = `${path} L ${pad + (series.length - 1) * stepX},${pad + innerH} L ${pad},${pad + innerH} Z`
  const color = METRICS.find(m => m.key === metric)?.color || "#1753b0"

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-64 md:h-80" preserveAspectRatio="none" role="img" aria-label="Trend chart">
      <defs>
        <linearGradient id="analytics-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <g key={i}>
          <line x1={pad} x2={w - pad} y1={pad + innerH * t} y2={pad + innerH * t} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
          <text x={pad - 10} y={pad + innerH * t + 4} fontSize="10" fill="currentColor" fillOpacity="0.45" textAnchor="end">
            {Math.round(max * (1 - t)).toLocaleString()}
          </text>
        </g>
      ))}
      <path d={area} fill="url(#analytics-area)" className="text-ui-fg-base" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.length > 0 && (
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4" fill={color} stroke="white" strokeWidth="2" />
      )}
      {series.map((b, i) => {
        const every = Math.max(1, Math.floor(series.length / 8))
        if (i % every !== 0 && i !== series.length - 1) return null
        return (
          <text key={b.date} x={pad + i * stepX} y={h - 10} fontSize="10" fill="currentColor" fillOpacity="0.45" textAnchor="middle">
            {b.date.slice(5)}
          </text>
        )
      })}
    </svg>
  )
}

function StackedBar({ series }: { series: Series }) {
  const w = 1000
  const h = 260
  const pad = 40
  const innerW = w - pad * 2
  const innerH = h - pad * 2
  const barW = Math.max(2, innerW / series.length - 2)
  const totals = series.map(b => b.call + b.whatsapp + b.webrtc + b.view)
  const max = Math.max(1, ...totals)
  const colors = { call: "#059669", whatsapp: "#16a34a", webrtc: "#d97706", view: "#1753b0" }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-64 md:h-80" preserveAspectRatio="none" role="img" aria-label="Stacked bar chart">
      {series.map((b, i) => {
        const x = pad + i * (barW + 2)
        let y = pad + innerH
        return (
          <g key={b.date}>
            {(["view", "webrtc", "whatsapp", "call"] as const).map(k => {
              const v = (b as any)[k] || 0
              const hgt = (v / max) * innerH
              y -= hgt
              return <rect key={k} x={x} y={y} width={barW} height={Math.max(0, hgt)} fill={colors[k]} rx="1" />
            })}
          </g>
        )
      })}
      {series.map((b, i) => {
        const every = Math.max(1, Math.floor(series.length / 8))
        if (i % every !== 0 && i !== series.length - 1) return null
        return (
          <text key={`x-${b.date}`} x={pad + i * (barW + 2) + barW / 2} y={h - 10} fontSize="10" fill="currentColor" fillOpacity="0.45" textAnchor="middle">
            {b.date.slice(5)}
          </text>
        )
      })}
    </svg>
  )
}

// Clear, labelled "how customers reach you" share bar — one glance shows which
// channel dominates. Additive: uses the same totals already on the page.
function ChannelShareBar({ totals }: { totals: { call: number; whatsapp: number; webrtc: number; view: number } }) {
  const items = [
    { label: "Phone calls", v: totals.call, color: "#059669" },
    { label: "WhatsApp", v: totals.whatsapp, color: "#16a34a" },
    { label: "Intl. calls", v: totals.webrtc, color: "#d97706" },
    { label: "Listing views", v: totals.view, color: "#1753b0" },
  ].filter(i => i.v > 0).sort((a, b) => b.v - a.v)
  const total = items.reduce((a, b) => a + b.v, 0)
  if (total <= 0) return null
  return (
    <div>
      <div className="flex w-full h-5 rounded-full overflow-hidden bg-ui-bg-subtle">
        {items.map(i => (
          <div key={i.label} style={{ width: `${(i.v / total) * 100}%`, backgroundColor: i.color }} title={`${i.label}: ${i.v.toLocaleString()}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
        {items.map(i => (
          <div key={i.label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: i.color }} />
            <span className="text-sm text-ui-fg-base font-medium">{i.label}</span>
            <span className="text-sm text-ui-fg-subtle">{Math.round((i.v / total) * 100)}% · {i.v.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Donut of channel share — same data as the bar, quick visual proportion.
function ChannelDonut({ totals }: { totals: { call: number; whatsapp: number; webrtc: number; view: number } }) {
  const items = [
    { v: totals.call, color: "#059669" },
    { v: totals.whatsapp, color: "#16a34a" },
    { v: totals.webrtc, color: "#d97706" },
    { v: totals.view, color: "#1753b0" },
  ].filter(i => i.v > 0)
  const total = items.reduce((a, b) => a + b.v, 0)
  if (total <= 0) return null
  const R = 52, C = 2 * Math.PI * R
  let offset = 0
  return (
    <svg viewBox="0 0 140 140" width={96} height={96} style={{ width: 96, height: 96, flexShrink: 0 }}>
      <g transform="translate(70,70) rotate(-90)">
        <circle r={R} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="16" />
        {items.map((i, idx) => {
          const len = (i.v / total) * C
          const el = <circle key={idx} r={R} fill="none" stroke={i.color} strokeWidth="16" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />
          offset += len
          return el
        })}
      </g>
      <text x="70" y="66" textAnchor="middle" fontSize="22" fontWeight="700" fill="currentColor">{total.toLocaleString()}</text>
      <text x="70" y="84" textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.5">contacts</text>
    </svg>
  )
}

// All channels on one line chart (compare channels over time without toggling).
function MultiLineChart({ series }: { series: Series }) {
  const channels = [
    { k: "call" as const, color: "#059669", label: "Calls" },
    { k: "whatsapp" as const, color: "#16a34a", label: "WhatsApp" },
    { k: "webrtc" as const, color: "#d97706", label: "Intl. calls" },
    { k: "view" as const, color: "#1753b0", label: "Views" },
  ]
  const [hidden, setHidden] = useState<Record<string, boolean>>({})
  const [hover, setHover] = useState<number | null>(null)
  const w = 1000, h = 260, pad = 40
  const innerW = w - pad * 2, innerH = h - pad * 2
  const visible = channels.filter(c => !hidden[c.k])
  const max = Math.max(1, ...series.flatMap(b => visible.map(c => (b as any)[c.k] || 0)))
  const stepX = innerW / Math.max(1, series.length - 1)
  const xOf = (i: number) => pad + i * stepX
  const yOf = (v: number) => pad + innerH - (v / max) * innerH
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((((e.clientX - r.left) / r.width) * w) - pad) / stepX)
    setHover(Math.max(0, Math.min(series.length - 1, i)))
  }
  return (
    <div style={{ position: "relative" }}>
      <div className="flex flex-wrap gap-3 justify-center mb-2 text-xs">
        {channels.map(c => (
          <button key={c.k} type="button" onClick={() => setHidden(o => ({ ...o, [c.k]: !o[c.k] }))}
            className="inline-flex items-center gap-1.5" style={{ background: "none", border: "none", cursor: "pointer", opacity: hidden[c.k] ? 0.4 : 1 }}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />
            <span className="text-ui-fg-subtle" style={{ textDecoration: hidden[c.k] ? "line-through" : "none" }}>{c.label}</span>
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-64 md:h-72" preserveAspectRatio="none" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          {visible.map(c => (<linearGradient key={c.k} id={`mlc-${c.k}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.color} stopOpacity="0.18" /><stop offset="100%" stopColor={c.color} stopOpacity="0" /></linearGradient>))}
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <g key={i}>
            <line x1={pad} x2={w - pad} y1={pad + innerH * t} y2={pad + innerH * t} stroke="currentColor" strokeOpacity="0.08" />
            <text x={pad - 10} y={pad + innerH * t + 4} fontSize="10" fill="currentColor" fillOpacity="0.45" textAnchor="end">{Math.round(max * (1 - t)).toLocaleString()}</text>
          </g>
        ))}
        {visible.map(c => {
          const pts = series.map((b, i) => [xOf(i), yOf((b as any)[c.k] || 0)])
          const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]},${p[1]}`).join(" ")
          const area = `${line} L ${xOf(series.length - 1)},${pad + innerH} L ${xOf(0)},${pad + innerH} Z`
          return <g key={c.k}><path d={area} fill={`url(#mlc-${c.k})`} /><path d={line} fill="none" stroke={c.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" /></g>
        })}
        {hover !== null && series[hover] && (
          <g>
            <line x1={xOf(hover)} x2={xOf(hover)} y1={pad} y2={pad + innerH} stroke="currentColor" strokeOpacity="0.25" strokeDasharray="3 3" />
            {visible.map(c => <circle key={c.k} cx={xOf(hover)} cy={yOf((series[hover] as any)[c.k] || 0)} r="3.5" fill={c.color} stroke="white" strokeWidth="1.5" />)}
          </g>
        )}
        {series.map((b, i) => {
          const every = Math.max(1, Math.floor(series.length / 8))
          if (i % every !== 0 && i !== series.length - 1) return null
          return <text key={b.date} x={xOf(i)} y={h - 10} fontSize="10" fill="currentColor" fillOpacity="0.45" textAnchor="middle">{b.date.slice(5)}</text>
        })}
      </svg>
      {hover !== null && series[hover] && (
        <div style={{ position: "absolute", top: 24, left: `${(xOf(hover) / w) * 100}%`, transform: "translateX(-50%)", pointerEvents: "none", zIndex: 5 }}
          className="rounded-lg border border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest px-3 py-2 text-xs whitespace-nowrap">
          <div className="font-semibold mb-1 text-ui-fg-base">{series[hover].date.slice(5)}</div>
          {visible.map(c => (<div key={c.k} className="flex items-center gap-1.5 text-ui-fg-subtle"><span className="w-2 h-2 rounded-sm" style={{ background: c.color }} /> {c.label}: <b className="text-ui-fg-base">{(series[hover] as any)[c.k] || 0}</b></div>))}
        </div>
      )}
    </div>
  )
}

function MetricIcon({ metric, colored }: { metric: Metric; colored?: boolean }) {
  const cls = colored ? "" : "text-ui-fg-subtle"
  if (metric === "call") return <Phone className={cls} />
  if (metric === "whatsapp") return <ChatBubbleLeftRight className={cls} />
  if (metric === "view") return <Eye className={cls} />
  if (metric === "webrtc") return <GlobeEurope className={cls} />
  return <ChartBar className={cls} />
}

// Tiny per-KPI sparkline (Stripe/Vercel style) — uses the series already on the page.
function MiniSpark({ values, color }: { values: number[]; color: string }) {
  if (!values || values.length < 2) return null
  const w = 100, h = 30, pad = 2
  const max = Math.max(1, ...values)
  const stepX = (w - pad * 2) / (values.length - 1)
  const pts = values.map((v, i) => [pad + i * stepX, pad + (h - pad * 2) - (v / max) * (h - pad * 2)])
  const line = pts.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join(" ")
  const area = `${line} L ${pts[pts.length - 1][0].toFixed(1)},${h} L ${pts[0][0].toFixed(1)},${h} Z`
  const gid = "spark-" + color.replace("#", "")
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-3 w-full block" style={{ height: 30 }} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.20" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
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

  useEffect(() => {
    if (rangeId === "custom") return
    const days = parseInt(rangeId, 10)
    setFrom(new Date(Date.now() - days * 86400000).toISOString().slice(0, 10))
    setTo(new Date().toISOString().slice(0, 10))
  }, [rangeId])

  useEffect(() => {
    fetch(`${API}/admin/sellers?limit=500`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then(d => d?.sellers && setSellersList(d.sellers.map((s: any) => ({ id: s.id, name: s.name }))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const qs = new URLSearchParams()
    qs.set("from", from)
    qs.set("to", to)
    if (sellerFilter) qs.set("seller_id", sellerFilter)
    if (eventFilter !== "all") qs.set("event_type", eventFilter)
    Promise.all([
      fetch(`${API}/admin/analytics/contacts?${qs}`, { credentials: "include" }).then(r => (r.ok ? r.json() : null)),
      fetch(`${API}/admin/analytics/timeseries?${qs}`, { credentials: "include" }).then(r => (r.ok ? r.json() : null)),
      fetch(
        `${API}/admin/analytics/geography?days=${Math.ceil((Date.parse(to) - Date.parse(from)) / 86400000) || 30}${sellerFilter ? `&seller_id=${sellerFilter}` : ""}`,
        { credentials: "include" }
      ).then(r => (r.ok ? r.json() : null)),
    ])
      .then(([s, t, g]) => {
        setStats(s)
        setSeries(t?.series || [])
        setGeo(g)
      })
      .finally(() => setLoading(false))
  }, [from, to, sellerFilter, eventFilter])

  const totals = stats?.totals || { call: 0, whatsapp: 0, webrtc: 0, view: 0 }
  const grandTotal = totals.call + totals.whatsapp + totals.webrtc + totals.view
  const valOf = (k: Metric) => (k === "all" ? grandTotal : (totals as any)[k] || 0)

  const growth = useMemo(() => {
    if (series.length < 4) return null
    const half = Math.max(1, Math.floor(series.length / 2))
    const sum = (rows: Series) => rows.reduce((a, b) => a + b.call + b.whatsapp + b.webrtc + b.view, 0)
    const first = sum(series.slice(0, half))
    const second = sum(series.slice(half))
    if (first <= 0) return second > 0 ? 100 : 0
    return Math.round((second / first - 1) * 100)
  }, [series])

  const filteredVendors = useMemo(() => {
    if (!stats) return []
    return [...stats.by_vendor].sort((a, b) => {
      const va = metric === "all" ? a.total : (a as any)[metric]
      const vb = metric === "all" ? b.total : (b as any)[metric]
      return vb - va
    })
  }, [stats, metric])

  const topChannel = useMemo(() => {
    const rows = [
      { key: "call", v: totals.call, label: "Calls" },
      { key: "whatsapp", v: totals.whatsapp, label: "WhatsApp" },
      { key: "webrtc", v: totals.webrtc, label: "Intl. calls" },
      { key: "view", v: totals.view, label: "Views" },
    ]
    return rows.sort((a, b) => b.v - a.v)[0]
  }, [totals])

  const exportCsv = () => {
    if (!stats) return
    const rows = [
      ["Rental Company", "Handle", "Phone Calls", "WhatsApp", "International", "Views", "Total"],
      ...filteredVendors.map(v => [v.seller_name, v.seller_handle || "", v.call, v.whatsapp, v.webrtc, v.view, v.total]),
    ]
    const csv = rows.map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `analytics-${from}_to_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <SingleColumnPage>
      {/* Page header */}
      <Container className="p-6 pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div
              className="flex items-center justify-center rounded-xl text-white shrink-0 shadow-elevation-card-rest"
              style={{ width: 48, height: 48, backgroundImage: "linear-gradient(135deg, #1753b0, #0ea5e9)" }}
            >
              <ChartBar />
            </div>
            <div>
              <Heading level="h1" className="text-2xl font-semibold tracking-tight">
                Analytics
              </Heading>
              <Text className="text-ui-fg-subtle mt-1 max-w-2xl">
                See how customers are reaching your rental companies, and which companies are getting the most interest.
              </Text>
              <Text size="small" className="text-ui-fg-muted mt-2 flex items-center gap-1.5">
                <Clock className="shrink-0" />
                {fmtRange(from, to)}
                {sellerFilter && sellersList.find(s => s.id === sellerFilter) && (
                  <span> · {sellersList.find(s => s.id === sellerFilter)?.name}</span>
                )}
              </Text>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" onClick={exportCsv} disabled={!stats || loading}>
              <ArrowDownTray />
              Export CSV
            </Button>
          </div>
        </div>
      </Container>
      <Container className="p-6 pt-0"><WebsiteTraffic /></Container>

      {/* Filters */}
      <Container className="p-4 mx-6 mb-0 rounded-xl border border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
          <div>
            <Text size="small" className="text-ui-fg-muted font-medium mb-1.5">Period</Text>
            <Select value={rangeId} onValueChange={setRangeId}>
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {RANGE_PRESETS.map(r => (
                  <Select.Item key={r.id} value={r.id}>
                    {r.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-muted font-medium mb-1.5">From</Text>
            <Input type="date" value={from} onChange={e => { setRangeId("custom"); setFrom(e.target.value) }} />
          </div>
          <div>
            <Text size="small" className="text-ui-fg-muted font-medium mb-1.5">To</Text>
            <Input type="date" value={to} onChange={e => { setRangeId("custom"); setTo(e.target.value) }} />
          </div>
          <div>
            <Text size="small" className="text-ui-fg-muted font-medium mb-1.5">Company</Text>
            <Select value={sellerFilter || "_all"} onValueChange={v => setSellerFilter(v === "_all" ? "" : v)}>
              <Select.Trigger>
                <Select.Value placeholder="All companies" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="_all">All companies</Select.Item>
                {sellersList.map(s => (
                  <Select.Item key={s.id} value={s.id}>
                    {s.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-muted font-medium mb-1.5">Event type</Text>
            <Select value={eventFilter} onValueChange={v => setEventFilter(v as Metric)}>
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="all">All events</Select.Item>
                <Select.Item value="call">Phone calls</Select.Item>
                <Select.Item value="whatsapp">WhatsApp</Select.Item>
                <Select.Item value="webrtc">International calls</Select.Item>
                <Select.Item value="view">Listing views</Select.Item>
              </Select.Content>
            </Select>
          </div>
        </div>
      </Container>

      {/* KPI cards */}
      <Container className="p-6 pt-5">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.75rem" }}>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5">
                  <Skeleton className="h-3 w-20 mb-3" />
                  <Skeleton className="h-8 w-24 mb-2" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))
            : METRICS.map(m => {
                const v = valOf(m.key)
                const active = metric === m.key
                const share = grandTotal > 0 && m.key !== "all" ? Math.round((v / grandTotal) * 100) : null
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMetric(m.key)}
                    className={`relative overflow-hidden text-left rounded-xl border p-5 transition-all duration-150 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-fg-interactive ${
                      active
                        ? "border-ui-fg-interactive bg-ui-bg-base shadow-elevation-card-rest ring-1 ring-ui-fg-interactive/20"
                        : "border-ui-border-base bg-ui-bg-base hover:border-ui-border-strong hover:shadow-elevation-card-rest"
                    }`}
                  >
                    <span aria-hidden className="absolute inset-x-0 top-0 h-1 transition-opacity" style={{ backgroundColor: m.color, opacity: active ? 1 : 0.2 }} />
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="flex items-center justify-center rounded-lg shrink-0"
                        style={{ width: 36, height: 36, backgroundColor: m.color + "1A", color: m.color }}
                      >
                        <MetricIcon metric={m.key} colored />
                      </span>
                      {share !== null && (
                        <Badge size="2xsmall" color="grey">
                          {share}% of total
                        </Badge>
                      )}
                      {m.key === "all" && growth !== null && (
                        <Badge size="2xsmall" color={growth >= 0 ? "green" : "red"}>
                          {growth >= 0 ? "▲ +" : "▼ "}
                          {growth}%
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-ui-fg-base">{v.toLocaleString()}</div>
                    <Text size="small" className="text-ui-fg-subtle mt-0.5">
                      {m.label}
                    </Text>
                    <MiniSpark
                      values={series.map(b => (m.key === "all" ? b.call + b.whatsapp + b.webrtc + b.view : (b as any)[m.key] || 0))}
                      color={m.color}
                    />
                  </button>
                )
              })}
        </div>
        {!loading && topChannel && topChannel.v > 0 && (
          <div className="mt-3 rounded-lg border border-ui-border-base bg-ui-bg-subtle px-4 py-3 text-sm text-ui-fg-subtle">
Most-used way customers get in touch: <span className="font-medium text-ui-fg-base">{topChannel.label}</span> ({topChannel.v.toLocaleString()} times
            {grandTotal > 0 ? ` · ${Math.round((topChannel.v / grandTotal) * 100)}% of all contacts` : ""})
          </div>
        )}
      </Container>

      {/* Chart */}
      <Container className="p-6">
        <div className="rounded-xl border border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest overflow-hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-ui-border-base">
            <div>
              <Heading level="h2" className="text-base font-semibold">
                {METRICS.find(m => m.key === metric)?.label} over time
              </Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Day-by-day trend for the selected period
              </Text>
            </div>
            <div className="inline-flex rounded-lg border border-ui-border-base bg-ui-bg-subtle p-0.5">
              <button
                type="button"
                onClick={() => setChartType("line")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${chartType === "line" ? "bg-ui-bg-base text-ui-fg-base shadow-sm" : "text-ui-fg-muted hover:text-ui-fg-subtle"}`}
              >
                Line
              </button>
              <button
                type="button"
                onClick={() => setChartType("bar")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${chartType === "bar" ? "bg-ui-bg-base text-ui-fg-base shadow-sm" : "text-ui-fg-muted hover:text-ui-fg-subtle"}`}
              >
                Stacked
              </button>
            </div>
          </div>
          <div className="px-2 py-4 md:px-4 text-ui-fg-base">
            {loading ? (
              <div className="p-8">
                <Skeleton className="h-64 w-full" />
              </div>
            ) : series.length === 0 ? (
              <div className="py-16 text-center">
                <ChartBar className="mx-auto mb-3 text-ui-fg-muted" />
                <Text className="text-ui-fg-subtle font-medium">No data for this period</Text>
                <Text size="small" className="text-ui-fg-muted mt-1">Try a wider date range or remove filters.</Text>
              </div>
            ) : chartType === "line" ? (
              <LineChart series={series} metric={metric} />
            ) : (
              <>
                <StackedBar series={series} />
                <div className="flex flex-wrap gap-4 justify-center mt-4 pb-2 text-xs text-ui-fg-muted">
                  <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#059669]" /> Calls</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#16a34a]" /> WhatsApp</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#d97706]" /> Intl.</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#1753b0]" /> Views</span>
                </div>
              </>
            )}
          </div>
        </div>
      </Container>

      {/* Channel breakdown (left)  ·  all channels over time (right) — side by side */}
      {!loading && grandTotal > 0 && (
        <Container className="p-6">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "1.5rem", alignItems: "start" }}>
            {/* How customers reach you */}
            <div className="rounded-xl border border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest px-5 py-4 h-full">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                <div>
                  <Heading level="h2" className="text-base font-semibold">How customers reach you</Heading>
                  <Text size="small" className="text-ui-fg-subtle">Share of every contact across all channels in this period</Text>
                </div>
                {growth !== null && (
                  <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${growth >= 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"}`}>
                    {growth >= 0 ? "▲" : "▼"} {Math.abs(growth)}% <span className="font-normal opacity-70">vs first half</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-5">
                <ChannelDonut totals={totals} />
                <div className="flex-1 min-w-0"><ChannelShareBar totals={totals} /></div>
              </div>
            </div>

            {/* All channels over time */}
            {series.length > 1 ? (
              <div className="rounded-xl border border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest overflow-hidden h-full">
                <div className="px-5 py-4 border-b border-ui-border-base">
                  <Heading level="h2" className="text-base font-semibold">All channels over time</Heading>
                  <Text size="small" className="text-ui-fg-subtle">Compare calls, WhatsApp, international calls and views day by day</Text>
                </div>
                <div className="px-2 py-4 md:px-4 text-ui-fg-base">
                  <MultiLineChart series={series} />
                </div>
              </div>
            ) : null}
          </div>
        </Container>
      )}

      {/* Companies + top vehicles */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: "1.5rem", padding: "0 1.5rem", alignItems: "start" }}>
        <Container className="xl:col-span-2 p-0 overflow-hidden rounded-xl border border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest mb-6 xl:mb-0">
          <div className="px-5 py-4 border-b border-ui-border-base flex items-center gap-2">
            <BuildingStorefront className="text-ui-fg-muted" />
            <div>
              <Heading level="h2" className="text-base font-semibold">
                Rental companies
              </Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Ranked by {METRICS.find(m => m.key === metric)?.label.toLowerCase()} · {filteredVendors.length} companies
              </Text>
            </div>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="py-14 text-center text-ui-fg-muted text-sm">No company data yet.</div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell className="w-10">#</Table.HeaderCell>
                  <Table.HeaderCell>Company</Table.HeaderCell>
                  <Table.HeaderCell>Calls</Table.HeaderCell>
                  <Table.HeaderCell>WhatsApp</Table.HeaderCell>
                  <Table.HeaderCell>Intl.</Table.HeaderCell>
                  <Table.HeaderCell>Views</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Total</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredVendors.map((v, i) => {
                  const max = Math.max(...filteredVendors.map(x => (metric === "all" ? x.total : (x as any)[metric])))
                  const cur = metric === "all" ? v.total : (v as any)[metric]
                  const pct = max > 0 ? (cur / max) * 100 : 0
                  return (
                    <Table.Row key={v.seller_id}>
                      <Table.Cell className="text-ui-fg-muted tabular-nums">{i + 1}</Table.Cell>
                      <Table.Cell>
                        <div className="font-medium text-ui-fg-base">{v.seller_name}</div>
                        {v.seller_handle && <div className="text-xs text-ui-fg-muted">{v.seller_handle}</div>}
                      </Table.Cell>
                      <Table.Cell className="tabular-nums text-ui-fg-subtle">{v.call.toLocaleString()}</Table.Cell>
                      <Table.Cell className="tabular-nums text-ui-fg-subtle">{v.whatsapp.toLocaleString()}</Table.Cell>
                      <Table.Cell className="tabular-nums text-ui-fg-subtle">{v.webrtc.toLocaleString()}</Table.Cell>
                      <Table.Cell className="tabular-nums text-ui-fg-subtle">{v.view.toLocaleString()}</Table.Cell>
                      <Table.Cell className="text-right">
                        <div className="flex items-center justify-end gap-2 min-w-[120px]">
                          <div className="hidden sm:block flex-1 max-w-[80px] h-1.5 bg-ui-bg-subtle rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-ui-fg-interactive" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-semibold tabular-nums">{v.total.toLocaleString()}</span>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table>
          )}
        </Container>

        {stats?.top_products && stats.top_products.length > 0 && (
          <Container className="p-0 overflow-hidden rounded-xl border border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest mb-6">
            <div className="px-5 py-4 border-b border-ui-border-base">
              <Heading level="h2" className="text-base font-semibold">
                Top vehicles
              </Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Most contacted listings
              </Text>
            </div>
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Vehicle</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Count</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {stats.top_products.slice(0, 10).map(p => (
                  <Table.Row key={`${p.product_id}-${p.event_type}`}>
                    <Table.Cell>
                      <div className="font-medium text-sm line-clamp-1">{p.product_title || p.product_id}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge size="2xsmall" color={EVENT_BADGE[p.event_type] || "grey"}>
                          {p.event_type}
                        </Badge>
                        <Text size="small" className="text-ui-fg-muted truncate">
                          {p.seller_name || "—"}
                        </Text>
                      </div>
                    </Table.Cell>
                    <Table.Cell className="text-right font-semibold tabular-nums">{p.count}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Container>
        )}
      </div>

      {/* Geography */}
      <Container className="p-4 sm:p-6">
        <div className="rounded-xl border border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-1">
            <GlobeEurope className="text-ui-fg-muted" />
            <Heading level="h2" className="text-base font-semibold">
              Visitor geography
            </Heading>
          </div>
          <Text size="small" className="text-ui-fg-subtle mb-5">
            Where your visitors are located and which devices they use.
          </Text>
          {/* Device breakdown on top — quick glance before the country list */}
          <div className="mb-5">
            <Text size="small" className="text-ui-fg-muted font-medium mb-3">
              Device breakdown
            </Text>
            <DeviceBreakdown data={geo?.devices || []} />
          </div>
          {/* Country list below */}
          <div>
            <Text size="small" className="text-ui-fg-muted font-medium mb-3">
              Top countries
            </Text>
            <CountryList data={geo?.countries || []} />
          </div>
        </div>
      </Container>

      {/* Heatmap */}
      <Container className="p-6">
        <div className="rounded-xl border border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest p-5">
          <Heading level="h2" className="text-base font-semibold">
            Busiest contact times
          </Heading>
          <Text size="small" className="text-ui-fg-subtle mb-4">
            The times of day when customers reach out the most (UAE time). Handy for planning staff shifts and when to run ads.
          </Text>
          {loading ? <Skeleton className="h-40 w-full" /> : <HeatmapChart data={geo?.heatmap || []} />}
        </div>
      </Container>
      <Container className="p-6">
        <AllEvents from={from} to={to} sellerId={sellerFilter} eventType={eventFilter} />
      </Container>
    </SingleColumnPage>
  )
}

export default Page

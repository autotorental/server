import { useCallback, useEffect, useMemo, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Badge, Button, Select } from "@medusajs/ui"
import { ChartBar, ArrowUpRightOnBox, ArrowPath, Clock, Eye, Users, Bolt } from "@medusajs/icons"
import { DeviceBreakdown } from "../../components/geo-widgets"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("Analytics (GA4)", "التحليلات (GA4)"), icon: ChartBar, rank: 20 }

type SeriesRow = { date: string; active_users: number; page_views: number; sessions: number }

type Data = {
  configured: boolean
  project_id?: string | null
  app_id?: string | null
  property_id?: string | null
  measurement_id?: string | null
  console_url: string
  analytics_url: string
  looker_embed_url?: string | null
  live_metrics_available: boolean
  oauth_client_ready?: boolean
  oauth_connected?: boolean
  days?: number
  realtime_users?: number
  totals?: {
    active_users: number
    page_views: number
    sessions: number
    avg_session_sec: number
    new_users: number
    bounce_rate: number
  }
  series?: SeriesRow[]
  by_country?: { country: string; users: number }[]
  by_device?: { device: string; users: number }[]
  top_pages?: { path: string; views: number }[]
  fetched_at?: string
  error?: string
}

const RANGES = [
  { id: "live", label: "🔴 Live" },
  { id: "7", label: "7 days" },
  { id: "28", label: "28 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
]

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-ui-bg-subtle ${className}`} />
}

function TrendChart({ series, metric }: { series: SeriesRow[]; metric: "active_users" | "page_views" | "sessions" }) {
  const w = 1000
  const h = 260
  const pad = 40
  const innerW = w - pad * 2
  const innerH = h - pad * 2
  const vals = series.map(r => r[metric] || 0)
  const max = Math.max(1, ...vals)
  const stepX = innerW / Math.max(1, series.length - 1)
  const pts = vals.map((v, i) => [pad + i * stepX, pad + innerH - (v / max) * innerH])
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]},${p[1]}`).join(" ")
  const area = `${path} L ${pad + (series.length - 1) * stepX},${pad + innerH} L ${pad},${pad + innerH} Z`
  const color = metric === "page_views" ? "#059669" : metric === "sessions" ? "#7c3aed" : "#2563eb"

  if (series.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-ui-border-base bg-ui-bg-subtle text-sm text-ui-fg-muted">
        No trend data for this period
      </div>
    )
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-64 md:h-72" preserveAspectRatio="none" role="img" aria-label="Traffic trend">
      <defs>
        <linearGradient id="firebase-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t, i) => (
        <g key={i}>
          <line x1={pad} x2={w - pad} y1={pad + innerH * t} y2={pad + innerH * t} stroke="currentColor" strokeOpacity="0.08" />
          <text x={pad - 8} y={pad + innerH * t + 4} fontSize="10" fill="currentColor" fillOpacity="0.45" textAnchor="end">
            {Math.round(max * (1 - t)).toLocaleString()}
          </text>
        </g>
      ))}
      <path d={area} fill="url(#firebase-area)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
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

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-ui-border-base bg-ui-bg-base p-5 shadow-elevation-card-rest" style={{ minHeight: 118 }}>
      <div className="absolute inset-x-0 top-0" style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}00)` }} />
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ui-fg-muted">{label}</div>
      <div className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ui-fg-base">{value}</div>
      <div className="mt-1 h-4 text-xs text-ui-fg-subtle">{sub || ""}</div>
    </div>
  )
}

function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.6 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.6 5.6C41.4 36 44 30.5 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
  )
}

const Page = () => {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [days, setDays] = useState("live")
  const [metric, setMetric] = useState<"active_users" | "page_views" | "sessions">("active_users")

  const mapLive = (l: any) => ({
    configured: true,
    live_metrics_available: true,
    is_first_party_live: true,
    property_id: "first-party",
    realtime_users: l.active_now || 0,
    totals: {
      active_users: l.visitors_today || 0,
      page_views: l.views_today || 0,
      sessions: l.visitors_today || 0,
      avg_session_sec: 0, new_users: 0, bounce_rate: 0,
    },
    by_country: (l.top_countries || []).map((c: any) => ({ country: c.country, users: c.n })),
    by_device: (l.by_device || []).map((x: any) => ({ device: x.device, users: x.n })),
    top_pages: (l.top_pages || []).map((x: any) => ({ path: x.path, views: x.n })),
    series: (l.per_minute || []).map((m: any) => ({ date: m.m, active_users: m.n, page_views: m.n, sessions: m.n })),
  })

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      if (days === "live") {
        const r = await fetch(`${API}/admin/analytics/live`, { credentials: "include" })
        setData(r.ok ? (mapLive(await r.json()) as any) : null)
      } else {
        const r = await fetch(`${API}/admin/analytics/firebase?days=${days}`, { credentials: "include" })
        setData(r.ok ? await r.json() : null)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [days])

  useEffect(() => { load() }, [load])

  const totals = data?.totals
  const series = data?.series || []
  const live = !!data?.live_metrics_available
  const embedUrl = data?.looker_embed_url?.trim()

  const fmtDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}m ${s}s`
  }

  const statusBadge = useMemo(() => {
    if ((data as any)?.is_first_party_live) return { color: "green" as const, label: "🔴 Live · first-party (real-time)" }
    if (embedUrl) return { color: "green" as const, label: "Looker report embedded" }
    if (live) return { color: "green" as const, label: "Live GA4 connected" }
    if (data?.property_id) return { color: "orange" as const, label: "Needs service account" }
    return { color: "grey" as const, label: "Not connected" }
  }, [data, embedUrl, live])

  if (loading && !data) {
    return (
      <SingleColumnPage>
        <Container className="p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="pt-4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: "14px" }}>
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-72" />
        </Container>
      </SingleColumnPage>
    )
  }

  return (
    <SingleColumnPage>
      <Container className="p-6 pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ui-fg-subtle">
              <ChartBar className="text-ui-fg-muted" />
              Website traffic
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Heading level="h1" className="text-2xl font-semibold tracking-tight">
                Firebase Analytics
              </Heading>
              <Badge color={statusBadge.color}>{statusBadge.label}</Badge>
            </div>
            <Text className="mt-1 max-w-2xl text-ui-fg-subtle">
              Live visitor metrics for autotorental.com — users, sessions, page views, geography, and devices.
            </Text>
            {data?.fetched_at && (
              <Text size="small" className="mt-2 flex items-center gap-1.5 text-ui-fg-muted">
                <Clock className="shrink-0" />
                Updated {new Date(data.fetched_at).toLocaleString()}
              </Text>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-[140px]">
              <Select value={days} onValueChange={setDays}>
                <Select.Trigger><Select.Value /></Select.Trigger>
                <Select.Content>
                  {RANGES.map(r => <Select.Item key={r.id} value={r.id}>{r.label}</Select.Item>)}
                </Select.Content>
              </Select>
            </div>
            <Button variant="secondary" onClick={() => load(true)} disabled={refreshing}>
              <ArrowPath className={refreshing ? "animate-spin" : ""} />
              Refresh
            </Button>
            <a href="/dashboard/overview">
              <Button variant="primary"><Bolt /> {tt("Customize charts", "تخصيص المخططات")}</Button>
            </a>
            <a href={data?.analytics_url || "https://analytics.google.com/"} target="_blank" rel="noopener">
              <Button variant="secondary"><ArrowUpRightOnBox /> Google Analytics</Button>
            </a>
            <a href={data?.console_url || "https://console.firebase.google.com/"} target="_blank" rel="noopener">
              <Button variant="secondary"><ArrowUpRightOnBox /> Firebase</Button>
            </a>
          </div>
        </div>

        {!live && !embedUrl && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-ui-border-base bg-ui-bg-subtle p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Text className="font-semibold text-ui-fg-base">Connect Google Analytics to load live data</Text>
              {data?.oauth_client_ready ? (
                <Text size="small" className="mt-1 max-w-xl text-ui-fg-subtle">
                  One click — sign in with the Google account that owns your Analytics. We detect your property, measurement ID and Firebase project automatically. No codes to copy.
                </Text>
              ) : (
                <Text size="small" className="mt-1 max-w-xl text-ui-fg-subtle">
                  One-time setup (~2 min): add your Google sign-in keys under Integrations → Firebase / GA4. After that, connecting is a single “Sign in with Google” click — forever.
                </Text>
              )}
            </div>
            {data?.oauth_client_ready ? (
              <a href={`${API}/admin/integrations/oauth/firebase/start?return_to=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin + "/dashboard/firebase-analytics" : "")}`}>
                <Button className="gap-2 whitespace-nowrap"><GoogleG /> Sign in with Google</Button>
              </a>
            ) : (
              <a href="/dashboard/integrations">
                <Button variant="secondary" className="whitespace-nowrap">Set up Google sign-in</Button>
              </a>
            )}
          </div>
        )}

        {data?.error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
            <strong>GA4 error:</strong> {data.error}
          </div>
        )}
      </Container>

      {embedUrl && (
        <Container className="p-0 overflow-hidden">
          <div className="border-y border-ui-border-base bg-ui-bg-subtle px-4 py-2 text-xs text-ui-fg-muted">
            Embedded Looker Studio report — same view as opening the shared Google dashboard in your browser.
          </div>
          <iframe
            title="GA4 Looker Studio dashboard"
            src={embedUrl}
            className="h-[min(78vh,920px)] w-full border-0 bg-white"
            allowFullScreen
            sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          />
        </Container>
      )}

      <Container className="p-6 pt-4">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: "14px" }}>
          <KpiCard
            label="Active users"
            value={live && totals ? totals.active_users.toLocaleString() : "—"}
            sub={live ? `Last ${days} days` : "Connect GA4"}
            accent="#3b82f6"
          />
          <KpiCard
            label="Page views"
            value={live && totals ? totals.page_views.toLocaleString() : "—"}
            sub={live ? `Last ${days} days` : undefined}
            accent="#10b981"
          />
          <KpiCard
            label="Sessions"
            value={live && totals ? totals.sessions.toLocaleString() : "—"}
            sub={live ? `Last ${days} days` : undefined}
            accent="#8b5cf6"
          />
          <KpiCard
            label="New users"
            value={live && totals ? totals.new_users.toLocaleString() : "—"}
            accent="#f59e0b"
          />
          <KpiCard
            label="Avg. session"
            value={live && totals ? fmtDuration(totals.avg_session_sec) : "—"}
            accent="#06b6d4"
          />
          <KpiCard
            label="Realtime"
            value={live ? (data?.realtime_users ?? 0).toLocaleString() : "—"}
            sub="Active now"
            accent="#ef4444"
          />
        </div>
      </Container>

      <Container className="p-6">
        <div className="rounded-xl border border-ui-border-base bg-ui-bg-base overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ui-border-base px-4 py-3">
            <Heading level="h2" className="text-base font-semibold">Traffic trend</Heading>
            <div className="flex flex-wrap gap-2">
              {([
                ["active_users", "Users", Users],
                ["page_views", "Page views", Eye],
                ["sessions", "Sessions", Bolt],
              ] as const).map(([key, label, Icon]) => (
                <Button
                  key={key}
                  size="small"
                  variant={metric === key ? "primary" : "secondary"}
                  onClick={() => setMetric(key)}
                >
                  <Icon />
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <div className="p-4">
            {loading ? <Skeleton className="h-72" /> : <TrendChart series={series} metric={metric} />}
          </div>
        </div>
      </Container>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
        <Container className="p-6">
          <Heading level="h2" className="mb-3 text-base font-semibold">Top countries</Heading>
          {!live || !data?.by_country?.length ? (
            <div className="rounded-lg border border-dashed border-ui-border-base bg-ui-bg-subtle p-8 text-center text-sm text-ui-fg-muted">
              Country breakdown appears once GA4 is connected.
            </div>
          ) : (
            <div className="space-y-2">
              {data.by_country.map((c, i) => {
                const max = Math.max(...data.by_country!.map(x => x.users))
                const pct = max > 0 ? (c.users / max) * 100 : 0
                return (
                  <div key={`${c.country}-${i}`} className="rounded-lg border border-ui-border-base bg-ui-bg-base px-3 py-2.5">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-medium">{i + 1}. {c.country || "Unknown"}</span>
                      <span className="text-sm font-semibold tabular-nums">{c.users.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ui-bg-subtle">
                      <div className="h-full rounded-full bg-ui-fg-interactive" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Container>

        <Container className="p-6">
          <Heading level="h2" className="mb-3 text-base font-semibold">Devices</Heading>
          {!live || !data?.by_device?.length ? (
            <div className="rounded-lg border border-dashed border-ui-border-base bg-ui-bg-subtle p-8 text-center text-sm text-ui-fg-muted">
              Device split appears once GA4 is connected.
            </div>
          ) : (
            <DeviceBreakdown
              data={data.by_device.map(d => ({
                type: d.device,
                count: d.users,
              }))}
            />
          )}
        </Container>
      </div>

      <Container className="p-6">
        <Heading level="h2" className="mb-3 text-base font-semibold">Top pages</Heading>
        {!live || !data?.top_pages?.length ? (
          <div className="rounded-lg border border-dashed border-ui-border-base bg-ui-bg-subtle p-8 text-center text-sm text-ui-fg-muted">
            Top landing pages appear once GA4 is connected.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-ui-border-base">
            {data.top_pages.map((p, i) => (
              <div
                key={p.path}
                className="flex items-center justify-between gap-3 border-b border-ui-border-base bg-ui-bg-base px-4 py-3 text-sm last:border-b-0"
              >
                <span className="truncate font-mono text-xs text-ui-fg-base">{i + 1}. {p.path}</span>
                <span className="shrink-0 font-semibold tabular-nums">{p.views.toLocaleString()} views</span>
              </div>
            ))}
          </div>
        )}
      </Container>

      {(data?.project_id || data?.property_id || data?.measurement_id) && (
        <Container className="p-6">
          <div className="flex flex-wrap gap-2 text-xs text-ui-fg-muted">
            {data.project_id && <Badge color="grey">Project: {data.project_id}</Badge>}
            {data.property_id && <Badge color="grey">Property: {data.property_id}</Badge>}
            {data.measurement_id && <Badge color="grey">Measurement: {data.measurement_id}</Badge>}
          </div>
        </Container>
      )}
    </SingleColumnPage>
  )
}

export default Page

import { useEffect, useMemo, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Button, Input } from "@medusajs/ui"
import { ChartBar } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("Traffic Reports", "تقارير الزيارات"), icon: ChartBar, rank: 23 }

type Row = { k: string; views: number; sessions: number }
type Data = {
  days: number
  totals: { views: number; sessions: number; prev_views: number; prev_sessions: number }
  trend: { d: string; views: number; sessions: number }[]
  hours: { h: number; views: number }[]
  pages: Row[]; countries: Row[]; devices: Row[]; browsers: Row[]; oses: Row[]; referrers: Row[]; languages: Row[]
}

const TABS = [
  { key: "pages", label: "Pages", col: "Page" },
  { key: "countries", label: "Countries", col: "Country" },
  { key: "devices", label: "Devices", col: "Device" },
  { key: "browsers", label: "Browsers", col: "Browser" },
  { key: "oses", label: "OS", col: "OS" },
  { key: "referrers", label: "Referrers", col: "Referrer" },
  { key: "languages", label: "Languages", col: "Language" },
] as const

const fmtPct = (cur: number, prev: number) => {
  if (!prev) return cur > 0 ? 100 : 0
  return Math.round(((cur - prev) / prev) * 100)
}

let __RDN: any = null
try { __RDN = new (Intl as any).DisplayNames(["en"], { type: "region" }) } catch { __RDN = null }
const countryName = (c: string) => { try { const u = String(c || "").toUpperCase(); const n = /^[A-Z]{2}$/.test(u) && __RDN ? __RDN.of(u) : null; return n && n !== u ? n : (c || "—") } catch { return c || "—" } }
const flagOf = (c: string) => { try { const u = String(c || "").toUpperCase(); return /^[A-Z]{2}$/.test(u) ? String.fromCodePoint(0x1f1e6 + u.charCodeAt(0) - 65, 0x1f1e6 + u.charCodeAt(1) - 65) + " " : "" } catch { return "" } }

const Kpi = ({ label, value, delta }: { label: string; value: number; delta: number }) => {
  const up = delta >= 0
  return (
    <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4">
      <Text size="xsmall" className="text-ui-fg-muted font-medium uppercase tracking-wide">{label}</Text>
      <div className="text-3xl font-semibold text-ui-fg-base mt-1 tabular-nums">{value.toLocaleString()}</div>
      <div className="mt-1.5"><Badge size="2xsmall" color={up ? "green" : "red"}>{up ? "▲" : "▼"} {Math.abs(delta)}% vs prev. period</Badge></div>
    </div>
  )
}

const Page = () => {
  const [d, setD] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)
  const [tab, setTab] = useState<string>("pages")
  const [q, setQ] = useState("")
  const [sort, setSort] = useState<{ by: string; dir: "asc" | "desc" }>({ by: "views", dir: "desc" })

  const load = (dd = days) => {
    setLoading(true)
    fetch(`${API}/admin/analytics/reports?days=${dd}`, { credentials: "include" })
      .then((r) => r.json()).then(setD).catch(() => setD(null)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const active = TABS.find((t) => t.key === tab) || TABS[0]
  const rows = useMemo(() => {
    if (!d) return [] as Row[]
    let r = (((d as any)[tab] as Row[]) || []).slice()
    const s = q.trim().toLowerCase()
    if (s) r = r.filter((x) => String(x.k).toLowerCase().includes(s))
    r.sort((a: any, b: any) => {
      const av = a[sort.by] ?? 0, bv = b[sort.by] ?? 0
      const c = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))
      return sort.dir === "asc" ? c : -c
    })
    return r
  }, [d, tab, q, sort])

  const exportCsv = () => {
    const header = `${active.col},Views,Sessions\n`
    const body = rows.map((r) => `"${String(r.k).replace(/"/g, '""')}",${r.views},${r.sessions}`).join("\n")
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `traffic-${tab}-${days}d.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const setSortCol = (c: string) => setSort((s) => (s.by === c ? { by: c, dir: s.dir === "asc" ? "desc" : "asc" } : { by: c, dir: "desc" }))
  const arrow = (c: string) => (sort.by === c ? (sort.dir === "asc" ? " ↑" : " ↓") : "")
  const trendMax = Math.max(1, ...((d?.trend || []).map((x) => x.views)))
  const hoursMax = Math.max(1, ...((d?.hours || []).map((x) => x.views)))

  return (
    <SingleColumnPage>
      <Container className="p-6 pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-lg bg-ui-bg-subtle border border-ui-border-base" style={{ width: 40, height: 40 }}>
              <ChartBar className="text-ui-fg-subtle" />
            </div>
            <div>
              <Heading level="h1">Traffic Reports</Heading>
              <Text size="small" className="text-ui-fg-subtle">Historical visitor analytics with period comparison, breakdowns & CSV export.</Text>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[1, 7, 30, 90].map((dd) => (
              <Button key={dd} size="small" variant={days === dd ? "primary" : "secondary"} onClick={() => { setDays(dd); load(dd) }}>{dd === 1 ? "Today" : `${dd}d`}</Button>
            ))}
            <Button size="small" variant="secondary" onClick={exportCsv} disabled={!rows.length}>Export CSV</Button>
          </div>
        </div>
      </Container>

      {loading ? (
        <Container className="p-6"><Text className="text-ui-fg-muted">Loading report…</Text></Container>
      ) : !d ? (
        <Container className="p-6"><Text className="text-ui-fg-error">Couldn’t load report.</Text></Container>
      ) : (
        <>
          <Container className="p-6 pt-2">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
              <Kpi label="Page views" value={d.totals.views} delta={fmtPct(d.totals.views, d.totals.prev_views)} />
              <Kpi label="Sessions" value={d.totals.sessions} delta={fmtPct(d.totals.sessions, d.totals.prev_sessions)} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem", marginTop: "0.75rem", alignItems: "start" }}>
              <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4">
                <Text size="xsmall" className="text-ui-fg-muted font-medium uppercase tracking-wide mb-2">Daily views</Text>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 70 }}>
                  {(d.trend || []).map((x, i) => (
                    <div key={i} title={`${x.d}: ${x.views} views · ${x.sessions} sessions`} style={{ flex: 1, height: `${Math.max(3, (x.views / trendMax) * 100)}%`, background: "var(--fg-interactive,#3b82f6)", borderRadius: 3, opacity: 0.85 }} />
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4">
                <Text size="xsmall" className="text-ui-fg-muted font-medium uppercase tracking-wide mb-2">Busiest hours (UTC)</Text>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 70 }}>
                  {Array.from({ length: 24 }, (_, h) => {
                    const v = (d.hours || []).find((x) => x.h === h)?.views || 0
                    return <div key={h} title={`${h}:00 — ${v} views`} style={{ flex: 1, height: `${Math.max(2, (v / hoursMax) * 100)}%`, background: "#22d3ee", borderRadius: 2, opacity: 0.8 }} />
                  })}
                </div>
              </div>
            </div>
          </Container>

          <Container className="p-6 pt-0">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {TABS.map((t) => (
                <Button key={t.key} size="small" variant={tab === t.key ? "primary" : "secondary"} onClick={() => { setTab(t.key); setSort({ by: "views", dir: "desc" }) }}>
                  {t.label} <span className="opacity-60">({((d as any)[t.key] || []).length})</span>
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <div style={{ minWidth: 220, flex: "1 1 260px" }}>
                <Input placeholder={`Filter ${active.label.toLowerCase()}…`} value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} />
              </div>
              <Badge color="grey">{rows.length} rows</Badge>
            </div>

            <div className="rounded-xl border border-ui-border-base bg-ui-bg-base overflow-hidden">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell className="cursor-pointer select-none" onClick={() => setSortCol("k")}>{active.col}{arrow("k")}</Table.HeaderCell>
                    <Table.HeaderCell className="text-right cursor-pointer select-none" onClick={() => setSortCol("views")}>Views{arrow("views")}</Table.HeaderCell>
                    <Table.HeaderCell className="text-right cursor-pointer select-none" onClick={() => setSortCol("sessions")}>Sessions{arrow("sessions")}</Table.HeaderCell>
                    <Table.HeaderCell className="text-right">Share</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {rows.length === 0 ? (
                    <Table.Row><Table.Cell colSpan={4}><Text className="text-ui-fg-muted py-4">No data for this range.</Text></Table.Cell></Table.Row>
                  ) : rows.map((r, i) => {
                    const share = d.totals.views ? Math.round((r.views / d.totals.views) * 100) : 0
                    return (
                      <Table.Row key={i}>
                        <Table.Cell className={tab === "pages" || tab === "referrers" ? "font-mono text-xs truncate max-w-[360px]" : "font-medium"} title={r.k}>{tab === "pages" ? (r.k.replace("https://autotorental.com", "") || "/") : tab === "countries" ? (flagOf(r.k) + countryName(r.k)) : r.k}</Table.Cell>
                        <Table.Cell className="text-right tabular-nums font-medium">{r.views.toLocaleString()}</Table.Cell>
                        <Table.Cell className="text-right tabular-nums text-ui-fg-subtle">{r.sessions.toLocaleString()}</Table.Cell>
                        <Table.Cell className="text-right">
                          <div className="inline-flex items-center gap-2 justify-end">
                            <div style={{ width: 50, height: 5, borderRadius: 3, background: "var(--bg-subtle,#e5e7eb)", overflow: "hidden" }}>
                              <div style={{ width: `${share}%`, height: "100%", background: "var(--fg-interactive,#3b82f6)" }} />
                            </div>
                            <span className="text-ui-fg-subtle" style={{ minWidth: 32, textAlign: "right" }}>{share}%</span>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table>
            </div>
          </Container>
        </>
      )}
    </SingleColumnPage>
  )
}
export default Page

import { useEffect, useMemo, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Button, Input } from "@medusajs/ui"
import { MagnifyingGlass } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("Search Console", "كونسول البحث"), icon: MagnifyingGlass, rank: 24 }

const C = { blue: "#3b82f6", violet: "#8b5cf6", emerald: "#10b981", amber: "#f59e0b", pink: "#ec4899", cyan: "#06b6d4", slate: "#64748b" }
const PAL = [C.blue, C.violet, C.emerald, C.amber, C.pink, C.cyan, C.slate]
const fmtN = (n: number) => Math.round(n).toLocaleString()

type Row = { query?: string; page?: string; country?: string; device?: string; clicks: number; impressions: number; ctr: number; position: number }
type DateRow = { date: string; clicks: number; impressions: number }
type Data = {
  connected?: boolean; site_url?: string; message?: string; hint?: string; service_account?: string
  totals?: { clicks: number; impressions: number; ctr: number; position: number }
  top_queries?: Row[]; top_pages?: Row[]; by_country?: Row[]; by_device?: Row[]; by_date?: DateRow[]
}

// ---------- inline charts (no dependency) ----------
function AreaChart({ labels, data, color, unit = "", height = 170 }: { labels: string[]; data: number[]; color: string; unit?: string; height?: number }) {
  const [hi, setHi] = useState<number | null>(null)
  const W = 800, H = height, P = { l: 6, r: 6, t: 12, b: 18 }
  const n = Math.max(1, data.length)
  const max = Math.max(1, ...data)
  const x = (i: number) => P.l + (i * (W - P.l - P.r)) / Math.max(1, n - 1)
  const y = (v: number) => P.t + (1 - v / max) * (H - P.t - P.b)
  const line = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")
  const area = `${line} L${x(n - 1)},${H - P.b} L${x(0)},${H - P.b} Z`
  if (n < 2) return <div className="text-ui-fg-muted text-sm py-10 text-center">{tt("No data yet", "لا توجد بيانات بعد")}</div>
  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height }} onMouseLeave={() => setHi(null)}>
        <defs><linearGradient id={`sc-${color}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.35" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={P.l} x2={W - P.r} y1={P.t + g * (H - P.t - P.b)} y2={P.t + g * (H - P.t - P.b)} stroke="currentColor" strokeOpacity="0.08" />)}
        <path d={area} fill={`url(#sc-${color})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {hi !== null && <line x1={x(hi)} x2={x(hi)} y1={P.t} y2={H - P.b} stroke="currentColor" strokeOpacity="0.25" />}
        {hi !== null && <circle cx={x(hi)} cy={y(data[hi] || 0)} r="3.5" fill={color} stroke="#fff" strokeWidth="1.5" />}
        {Array.from({ length: n }).map((_, i) => <rect key={i} x={x(i) - (W / n) / 2} y={0} width={W / n} height={H} fill="transparent" onMouseEnter={() => setHi(i)} />)}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, opacity: 0.55, marginTop: 2 }}>
        <span>{labels[0]}</span><span>{labels[Math.floor(labels.length / 2)]}</span><span>{labels[labels.length - 1]}</span>
      </div>
      {hi !== null && (
        <div style={{ position: "absolute", top: 4, left: `${(x(hi) / W) * 100}%`, transform: "translateX(-50%)", pointerEvents: "none", background: "rgba(15,23,42,.92)", color: "#fff", borderRadius: 8, padding: "5px 9px", fontSize: 11, whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(0,0,0,.3)" }}>
          <div style={{ opacity: 0.7 }}>{labels[hi]}</div><b>{(data[hi] || 0).toLocaleString()}{unit}</b>
        </div>
      )}
    </div>
  )
}

function BarList({ items, color }: { items: { label: string; value: number; sub?: string }[]; color?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  if (!items.length) return <div className="text-ui-fg-muted text-sm py-6 text-center">{tt("No data yet", "لا توجد بيانات")}</div>
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 150, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={it.label}>{it.label}</span>
          <div style={{ flex: 1, height: 9, borderRadius: 6, background: "rgba(120,120,140,.12)", overflow: "hidden" }}>
            <div style={{ width: `${(it.value / max) * 100}%`, height: "100%", borderRadius: 6, background: `linear-gradient(90deg, ${color || PAL[i % PAL.length]}, ${color || PAL[(i + 1) % PAL.length]})` }} />
          </div>
          <b style={{ width: 54, textAlign: "right", fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{fmtN(it.value)}</b>
        </div>
      ))}
    </div>
  )
}

function Donut({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((a, b) => a + b.value, 0)
  const r = 54, circ = 2 * Math.PI * r
  let acc = 0
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
      <svg viewBox="0 0 140 140" style={{ width: 130, height: 130, flex: "none" }}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="16" />
        {total > 0 && segments.map((s, i) => { const len = (s.value / total) * circ; const el = <circle key={i} cx="70" cy="70" r={r} fill="none" stroke={s.color} strokeWidth="16" strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-acc} transform="rotate(-90 70 70)" />; acc += len; return el })}
        <text x="70" y="66" textAnchor="middle" fontSize="20" fontWeight="800" fill="currentColor">{fmtN(total)}</text>
        <text x="70" y="84" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.55">{tt("clicks", "نقرات")}</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {segments.map((s, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} /><span style={{ flex: 1 }}>{s.label}</span><b style={{ fontVariantNumeric: "tabular-nums" }}>{fmtN(s.value)}</b></div>)}
      </div>
    </div>
  )
}

const Card = ({ title, sub, accent, children }: { title: string; sub?: string; accent?: string; children: any }) => (
  <div className="rounded-xl border border-ui-border-base bg-ui-bg-base" style={{ position: "relative", padding: 16, overflow: "hidden" }}>
    {accent && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent}, transparent)` }} />}
    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{title}</div>
    {sub && <div className="text-ui-fg-muted" style={{ fontSize: 11.5, marginTop: 2 }}>{sub}</div>}
    <div style={{ marginTop: 12 }}>{children}</div>
  </div>
)

const Stat = ({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) => (
  <div style={{ borderRadius: 16, padding: "15px 18px", background: `linear-gradient(135deg, ${accent}1f, ${accent}08)`, border: `1px solid ${accent}33` }}>
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: accent }}>{label}</div>
    <div style={{ fontSize: 27, fontWeight: 800, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    {sub && <div className="text-ui-fg-muted" style={{ fontSize: 11.5, marginTop: 2 }}>{sub}</div>}
  </div>
)

const TABS = [
  { key: "query", label: tt("Queries", "الكلمات"), field: "query", get: (d: Data) => d.top_queries || [] },
  { key: "page", label: tt("Pages", "الصفحات"), field: "page", get: (d: Data) => d.top_pages || [] },
  { key: "country", label: tt("Countries", "الدول"), field: "country", get: (d: Data) => d.by_country || [] },
  { key: "device", label: tt("Devices", "الأجهزة"), field: "device", get: (d: Data) => d.by_device || [] },
] as const
const POS = [{ k: "all", l: tt("All", "الكل") }, { k: "top3", l: tt("Top 3", "أول 3") }, { k: "top10", l: tt("Top 10", "أول 10") }, { k: "11_20", l: "11–20" }, { k: "21p", l: "21+" }]
const posColor = (p: number) => (p <= 10 ? "green" : p <= 20 ? "orange" : "grey")
const stripPage = (v: string) => v.replace(/^https?:\/\/[^/]+/, "") || "/"
const cellLabel = (r: Row, field: string) => { const v = String((r as any)[field] ?? ""); if (field === "page") return stripPage(v); if (field === "country") return v.toUpperCase(); if (field === "device") return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase(); return v }

const Page = () => {
  const [d, setD] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(28)
  const [tab, setTab] = useState<string>("query")
  const [q, setQ] = useState("")
  const [pos, setPos] = useState("all")
  const [minImpr, setMinImpr] = useState(0)
  const [sort, setSort] = useState<{ by: string; dir: "asc" | "desc" }>({ by: "clicks", dir: "desc" })
  const [trend, setTrend] = useState<"clicks" | "impressions" | "ctr">("clicks")

  const load = (dd = days) => {
    setLoading(true)
    fetch(`${API}/admin/search-console?days=${dd}`, { credentials: "include" })
      .then((r) => r.json()).then(setD).catch(() => setD({ message: "Failed to load" })).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const connected = d?.connected && d?.totals
  const active = TABS.find((t) => t.key === tab) || TABS[0]
  const field = active.field

  const rows = useMemo(() => {
    if (!d) return [] as Row[]
    let r = active.get(d).slice()
    const s = q.trim().toLowerCase()
    if (s) r = r.filter((x) => String((x as any)[field] ?? "").toLowerCase().includes(s))
    if (minImpr > 0) r = r.filter((x) => x.impressions >= minImpr)
    if (pos !== "all") r = r.filter((x) => { const p = x.position; return pos === "top3" ? p <= 3 : pos === "top10" ? p <= 10 : pos === "11_20" ? (p > 10 && p <= 20) : p > 20 })
    r.sort((a, b) => { const av = (a as any)[sort.by] ?? 0, bv = (b as any)[sort.by] ?? 0; const c = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv)); return sort.dir === "asc" ? c : -c })
    return r
  }, [d, tab, q, pos, minImpr, sort, field, active])

  const setSortCol = (col: string) => setSort((cur) => (cur.by === col ? { by: col, dir: cur.dir === "asc" ? "desc" : "asc" } : { by: col, dir: col === "position" || col === field ? "asc" : "desc" }))
  const arrow = (col: string) => (sort.by === col ? (sort.dir === "asc" ? " ↑" : " ↓") : "")

  const byDate = d?.by_date || []
  const trendLabels = byDate.map((x) => (x.date || "").slice(5))
  const trendData = byDate.map((x) => trend === "clicks" ? x.clicks : trend === "impressions" ? x.impressions : (x.impressions > 0 ? +((x.clicks / x.impressions) * 100).toFixed(2) : 0))
  const trendColor = trend === "clicks" ? C.blue : trend === "impressions" ? C.violet : C.emerald

  const topQ = (d?.top_queries || []).slice().sort((a, b) => b.clicks - a.clicks).slice(0, 8).map((r) => ({ label: r.query || "—", value: r.clicks }))
  const topP = (d?.top_pages || []).slice().sort((a, b) => b.clicks - a.clicks).slice(0, 8).map((r) => ({ label: stripPage(String(r.page || "")), value: r.clicks }))
  const topC = (d?.by_country || []).slice().sort((a, b) => b.clicks - a.clicks).slice(0, 8).map((r) => ({ label: String(r.country || "").toUpperCase(), value: r.clicks }))
  const devSeg = (d?.by_device || []).map((r, i) => ({ label: cellLabel(r, "device"), value: r.clicks, color: PAL[i % PAL.length] }))
  const bestQ = topQ[0]
  const bestP = topP[0]

  return (
    <SingleColumnPage>
      <Container className="p-6 pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-lg bg-ui-bg-subtle border border-ui-border-base" style={{ width: 40, height: 40 }}><MagnifyingGlass className="text-ui-fg-subtle" /></div>
            <div>
              <Heading level="h1">🔎 Search Console</Heading>
              <Text size="small" className="text-ui-fg-subtle">{tt("Real Google Search performance — queries, pages, countries & devices.", "أداء بحث جوجل الحقيقي — الكلمات والصفحات والدول والأجهزة.")}</Text>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[7, 28, 90].map((dd) => <Button key={dd} size="small" variant={days === dd ? "primary" : "secondary"} onClick={() => { setDays(dd); load(dd) }}>{dd}{tt("d", "ي")}</Button>)}
          </div>
        </div>
      </Container>

      {loading ? (
        <Container className="p-6"><Text className="text-ui-fg-muted">{tt("Loading Google Search Console…", "جارٍ تحميل Google Search Console…")}</Text></Container>
      ) : !connected ? (
        <Container className="p-6">
          <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-6">
            <Heading level="h2" className="text-base font-semibold mb-2">⚙️ {tt("Two steps to connect (one-time)", "خطوتان للربط (مرة واحدة)")}</Heading>
            <Text size="small" className="text-ui-fg-subtle mb-3">{d?.message || tt("Not connected yet.", "لم يُربط بعد.")}</Text>
            <ol className="list-decimal ml-5 space-y-2 text-sm text-ui-fg-base">
              <li>{tt("Enable the API:", "فعّل الـAPI:")} <a className="text-ui-fg-interactive underline" href="https://console.developers.google.com/apis/api/searchconsole.googleapis.com/overview?project=92546169504" target="_blank" rel="noopener">Google Cloud → Search Console API</a> → <strong>Enable</strong>.</li>
              <li>{tt("Grant access in", "امنح الوصول في")} <a className="text-ui-fg-interactive underline" href="https://search.google.com/search-console/users" target="_blank" rel="noopener">Search Console → Users and permissions</a>:
                <div className="font-mono text-xs bg-ui-bg-base border border-ui-border-base rounded px-2 py-1 mt-1 inline-block">{d?.service_account || "firebase-adminsdk-fbsvc@auto-to-rental.iam.gserviceaccount.com"}</div>
              </li>
            </ol>
            <Button className="mt-4" onClick={() => load()}>{tt("Retry connection", "إعادة المحاولة")}</Button>
          </div>
        </Container>
      ) : (
        <>
          {/* KPIs */}
          <Container className="p-6 pt-2">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
              <Stat label={tt("Total clicks", "إجمالي النقرات")} value={d!.totals!.clicks.toLocaleString()} accent={C.blue} />
              <Stat label={tt("Impressions", "مرّات الظهور")} value={d!.totals!.impressions.toLocaleString()} accent={C.violet} />
              <Stat label={tt("Avg CTR", "متوسط CTR")} value={`${d!.totals!.ctr}%`} sub={tt("clicks ÷ impressions", "النقرات ÷ الظهور")} accent={C.emerald} />
              <Stat label={tt("Avg position", "متوسط الترتيب")} value={String(d!.totals!.position)} sub={tt("lower is better ⬇", "الأقل أفضل ⬇")} accent={C.amber} />
            </div>

            {/* Trend with metric toggle */}
            <div className="rounded-xl border border-ui-border-base bg-ui-bg-base mt-3" style={{ position: "relative", padding: 16, overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${trendColor}, transparent)` }} />
              <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{tt("Performance over time", "الأداء عبر الزمن")} <span className="text-ui-fg-muted" style={{ fontWeight: 400 }}>· {tt(`last ${days}d`, `آخر ${days} يوم`)}</span></div>
                <div style={{ display: "inline-flex", borderRadius: 9, overflow: "hidden", border: "1px solid rgba(120,120,140,.25)" }}>
                  {([["clicks", tt("Clicks", "نقرات")], ["impressions", tt("Impressions", "ظهور")], ["ctr", "CTR %"]] as const).map(([k, l]) => (
                    <button key={k} onClick={() => setTrend(k)} style={{ padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none", background: trend === k ? trendColor : "transparent", color: trend === k ? "#fff" : "inherit" }}>{l}</button>
                  ))}
                </div>
              </div>
              <AreaChart labels={trendLabels} data={trendData} color={trendColor} unit={trend === "ctr" ? "%" : ""} />
            </div>
            <Text size="xsmall" className="text-ui-fg-muted mt-2">{tt("Property", "الموقع")}: {d!.site_url} {bestQ ? `· ${tt("top query", "أعلى كلمة")}: “${bestQ.label}”` : ""}</Text>
          </Container>

          {/* Visual overview */}
          <Container className="p-6 pt-0">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
              <Card title={tt("Top queries", "أعلى الكلمات")} sub={tt("by clicks", "حسب النقرات")} accent={C.blue}><BarList items={topQ} color={C.blue} /></Card>
              <Card title={tt("Top pages", "أعلى الصفحات")} sub={tt("by clicks", "حسب النقرات")} accent={C.violet}><BarList items={topP} color={C.violet} /></Card>
              <Card title={tt("Devices", "الأجهزة")} sub={tt("clicks share", "حصة النقرات")} accent={C.cyan}><Donut segments={devSeg} /></Card>
              <Card title={tt("Top countries", "أعلى الدول")} sub={tt("by clicks", "حسب النقرات")} accent={C.emerald}><BarList items={topC} color={C.emerald} /></Card>
            </div>
          </Container>

          {/* Detailed explorer */}
          <Container className="p-6 pt-0">
            <Heading level="h2" className="text-base font-semibold mb-3">📋 {tt("Explore details", "استكشاف التفاصيل")}</Heading>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {TABS.map((t) => <Button key={t.key} size="small" variant={tab === t.key ? "primary" : "secondary"} onClick={() => { setTab(t.key); setSort({ by: "clicks", dir: "desc" }) }}>{t.label} <span className="opacity-60">({t.get(d!).length})</span></Button>)}
            </div>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <div style={{ minWidth: 200, flex: "1 1 220px" }}><Input placeholder={tt(`Filter…`, "تصفية…")} value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} /></div>
              <div className="flex items-center gap-1">{POS.map((p) => <Button key={p.k} size="small" variant={pos === p.k ? "primary" : "transparent"} onClick={() => setPos(p.k)}>{p.l}</Button>)}</div>
              <div className="flex items-center gap-1"><Text size="xsmall" className="text-ui-fg-muted">{tt("Min impr.", "أدنى ظهور")}</Text><div style={{ width: 84 }}><Input type="number" value={String(minImpr)} onChange={(e) => setMinImpr(Math.max(0, Number((e.target as HTMLInputElement).value) || 0))} /></div></div>
              <Badge color="grey">{rows.length} {tt("rows", "صف")}</Badge>
            </div>
            <div className="rounded-xl border border-ui-border-base bg-ui-bg-base overflow-hidden">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell className="cursor-pointer select-none" onClick={() => setSortCol(field)}>{active.label}{arrow(field)}</Table.HeaderCell>
                    <Table.HeaderCell className="text-right cursor-pointer select-none" onClick={() => setSortCol("clicks")}>{tt("Clicks", "نقرات")}{arrow("clicks")}</Table.HeaderCell>
                    <Table.HeaderCell className="text-right cursor-pointer select-none" onClick={() => setSortCol("impressions")}>{tt("Impr.", "ظهور")}{arrow("impressions")}</Table.HeaderCell>
                    <Table.HeaderCell className="text-right cursor-pointer select-none" onClick={() => setSortCol("ctr")}>CTR{arrow("ctr")}</Table.HeaderCell>
                    <Table.HeaderCell className="text-right cursor-pointer select-none" onClick={() => setSortCol("position")}>{tt("Pos.", "ترتيب")}{arrow("position")}</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {rows.length === 0 ? (
                    <Table.Row><Table.Cell colSpan={5}><Text className="text-ui-fg-muted py-4">{tt("No rows match your filters.", "لا صفوف مطابقة.")}</Text></Table.Cell></Table.Row>
                  ) : rows.slice(0, 100).map((r, i) => (
                    <Table.Row key={i}>
                      <Table.Cell className={field === "page" ? "font-mono text-xs truncate max-w-[320px]" : "font-medium"} title={String((r as any)[field] || "")}>{cellLabel(r, field)}</Table.Cell>
                      <Table.Cell className="text-right tabular-nums font-medium">{r.clicks.toLocaleString()}</Table.Cell>
                      <Table.Cell className="text-right tabular-nums text-ui-fg-subtle">{r.impressions.toLocaleString()}</Table.Cell>
                      <Table.Cell className="text-right tabular-nums">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <div style={{ width: 44, height: 5, borderRadius: 3, background: "rgba(120,120,140,.2)", overflow: "hidden" }}><div style={{ width: `${Math.min(100, (r.ctr || 0) * 4)}%`, height: "100%", background: C.emerald }} /></div>
                          <span className="text-ui-fg-subtle" style={{ minWidth: 38, textAlign: "right" }}>{r.ctr}%</span>
                        </div>
                      </Table.Cell>
                      <Table.Cell className="text-right tabular-nums"><Badge color={posColor(r.position)}>{r.position}</Badge></Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
              {rows.length > 100 && <div className="text-ui-fg-muted text-center py-2" style={{ fontSize: 12 }}>{tt(`Showing top 100 of ${rows.length}`, `عرض أعلى 100 من ${rows.length}`)}</div>}
            </div>
          </Container>
        </>
      )}
    </SingleColumnPage>
  )
}
export default Page

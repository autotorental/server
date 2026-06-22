import { useEffect, useMemo, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Button, Input, Badge, toast } from "@medusajs/ui"
import { MagnifyingGlass } from "@medusajs/icons"
import { API } from "../../lib/api"
import { tt } from "../../lib/lang"

export const config: RouteConfig = { label: tt("Bing Search", "بحث Bing"), icon: MagnifyingGlass, rank: 25 }

const TEAL = "#00b7c3", TEAL2 = "#0c8484"
const C = { teal: TEAL, violet: "#8b5cf6", emerald: "#10b981", amber: "#f59e0b", slate: "#64748b" }
const fmtN = (n: number) => Math.round(n).toLocaleString()

type Row = { query?: string; page?: string; clicks: number; impressions: number; position: number }
type Data = {
  connected?: boolean; error?: boolean; message?: string; site_url?: string
  totals?: { clicks: number; impressions: number; ctr: number }
  by_date?: { date: string; clicks: number; impressions: number }[]
  top_queries?: Row[]; top_pages?: Row[]
}

// ---- inline charts ----
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
        <defs><linearGradient id={`bg-${color}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.35" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={P.l} x2={W - P.r} y1={P.t + g * (H - P.t - P.b)} y2={P.t + g * (H - P.t - P.b)} stroke="currentColor" strokeOpacity="0.08" />)}
        <path d={area} fill={`url(#bg-${color})`} />
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

function BarList({ items, color }: { items: { label: string; value: number }[]; color: string }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  if (!items.length) return <div className="text-ui-fg-muted text-sm py-6 text-center">{tt("No data yet", "لا توجد بيانات")}</div>
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 150, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={it.label}>{it.label}</span>
          <div style={{ flex: 1, height: 9, borderRadius: 6, background: "rgba(120,120,140,.12)", overflow: "hidden" }}><div style={{ width: `${(it.value / max) * 100}%`, height: "100%", borderRadius: 6, background: `linear-gradient(90deg, ${color}, ${TEAL2})` }} /></div>
          <b style={{ width: 54, textAlign: "right", fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{fmtN(it.value)}</b>
        </div>
      ))}
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
const stripPage = (v: string) => v.replace(/^https?:\/\/[^/]+/, "") || "/"
const ctrOf = (r: Row) => (r.impressions > 0 ? +((r.clicks / r.impressions) * 100).toFixed(1) : 0)
const posColor = (p: number) => (p <= 10 ? "green" : p <= 20 ? "orange" : "grey")

export default function Page() {
  const [d, setD] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"query" | "page">("query")
  const [keyInput, setKeyInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [trend, setTrend] = useState<"clicks" | "impressions" | "ctr">("impressions")
  const [sort, setSort] = useState<{ by: string; dir: "asc" | "desc" }>({ by: "clicks", dir: "desc" })

  const load = () => {
    setLoading(true)
    fetch(`${API}/admin/bing-webmaster`, { credentials: "include" })
      .then((r) => r.json()).then(setD).catch(() => setD({ message: "Failed to load" })).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const saveKey = async () => {
    if (!keyInput.trim()) return
    setSaving(true)
    try {
      const r = await fetch(`${API}/admin/settings`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bing_webmaster_api_key: keyInput.trim() }) })
      if (r.ok) { toast.success(tt("Saved ✓ — connecting…", "تم الحفظ ✓ — جارٍ الربط…")); setKeyInput(""); setTimeout(load, 500) }
      else toast.error(tt("Save failed", "فشل الحفظ"))
    } catch { toast.error(tt("Save failed", "فشل الحفظ")) }
    setSaving(false)
  }

  const connected = d?.connected && d?.totals
  const byDate = d?.by_date || []
  const trendLabels = byDate.map((x) => (x.date || "").slice(5))
  const trendData = byDate.map((x) => trend === "clicks" ? x.clicks : trend === "impressions" ? x.impressions : (x.impressions > 0 ? +((x.clicks / x.impressions) * 100).toFixed(2) : 0))
  const trendColor = trend === "clicks" ? C.teal : trend === "impressions" ? C.violet : C.emerald

  const topQ = (d?.top_queries || []).slice().sort((a, b) => b.clicks - a.clicks).slice(0, 8).map((r) => ({ label: r.query || "—", value: r.clicks }))
  const topP = (d?.top_pages || []).slice().sort((a, b) => b.clicks - a.clicks).slice(0, 8).map((r) => ({ label: stripPage(String(r.page || "")), value: r.clicks }))

  const rows: Row[] = useMemo(() => {
    const base = ((tab === "query" ? d?.top_queries : d?.top_pages) || []).slice()
    base.sort((a, b) => {
      const av = sort.by === "ctr" ? ctrOf(a) : ((a as any)[sort.by] ?? 0)
      const bv = sort.by === "ctr" ? ctrOf(b) : ((b as any)[sort.by] ?? 0)
      const c = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))
      return sort.dir === "asc" ? c : -c
    })
    return base
  }, [d, tab, sort])
  const setSortCol = (col: string) => setSort((cur) => (cur.by === col ? { by: col, dir: cur.dir === "asc" ? "desc" : "asc" } : { by: col, dir: col === "position" ? "asc" : "desc" }))
  const arrow = (col: string) => (sort.by === col ? (sort.dir === "asc" ? " ↑" : " ↓") : "")

  return (
    <SingleColumnPage>
      <Container className="p-6 pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-lg" style={{ width: 40, height: 40, background: `linear-gradient(135deg,${TEAL2},${TEAL})` }}><MagnifyingGlass className="text-white" /></div>
            <div>
              <Heading level="h1">🅱️ {tt("Bing Search", "بحث Bing")}</Heading>
              <Text size="small" className="text-ui-fg-subtle">{tt("Real Bing Webmaster performance — clicks, impressions, top queries & pages.", "أداء بحث Bing الحقيقي — نقرات، ظهور، أهم الكلمات والصفحات.")}</Text>
            </div>
          </div>
          {connected && <Button size="small" variant="secondary" onClick={load}>{tt("Refresh", "تحديث")}</Button>}
        </div>
      </Container>

      {loading ? (
        <Container className="p-6"><Text className="text-ui-fg-muted">{tt("Loading Bing…", "جارٍ التحميل…")}</Text></Container>
      ) : !connected ? (
        <Container className="p-6">
          <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-6">
            <Heading level="h2" className="text-base font-semibold mb-2">🔑 {tt("Connect Bing Webmaster (one-time)", "اربط Bing Webmaster (مرة واحدة)")}</Heading>
            {d?.message && <Text size="small" className="text-ui-fg-error mb-2">{d.message}</Text>}
            <ol className="list-decimal ml-5 space-y-2 text-sm text-ui-fg-base mb-4">
              <li>{tt("Open", "افتح")} <a className="text-ui-fg-interactive underline" href="https://www.bing.com/webmasters" target="_blank" rel="noopener">Bing Webmaster Tools</a> {tt("and verify the site (the verification tag is already on autotorental.com).", "ووثّق الموقع (وسم التحقق مضاف أصلاً).")}</li>
              <li>{tt("Go to", "اذهب إلى")} <b>Settings → API access → API Key</b> {tt("and generate a key.", "وأنشئ مفتاحاً.")}</li>
              <li>{tt("Paste it here (saved securely, only the owner can see it):", "الصقه هنا (يُحفظ بأمان، المالك فقط يراه):")}</li>
            </ol>
            <div className="flex items-center gap-2" style={{ maxWidth: 560 }}>
              <Input value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder={tt("Bing Webmaster API key", "مفتاح Bing Webmaster")} type="password" />
              <Button variant="primary" onClick={saveKey} isLoading={saving} disabled={!keyInput.trim()}>{tt("Save & connect", "حفظ وربط")}</Button>
            </div>
          </div>
        </Container>
      ) : (
        <>
          <Container className="p-6 pt-2">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <Stat label={tt("Total clicks", "إجمالي النقرات")} value={d!.totals!.clicks.toLocaleString()} accent={C.teal} />
              <Stat label={tt("Impressions", "مرّات الظهور")} value={d!.totals!.impressions.toLocaleString()} accent={C.violet} />
              <Stat label={tt("Avg CTR", "متوسط CTR")} value={`${d!.totals!.ctr}%`} sub={tt("clicks ÷ impressions", "النقرات ÷ الظهور")} accent={C.emerald} />
            </div>

            <div className="rounded-xl border border-ui-border-base bg-ui-bg-base mt-3" style={{ position: "relative", padding: 16, overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${trendColor}, transparent)` }} />
              <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{tt("Performance over time", "الأداء عبر الزمن")}</div>
                <div style={{ display: "inline-flex", borderRadius: 9, overflow: "hidden", border: "1px solid rgba(120,120,140,.25)" }}>
                  {([["clicks", tt("Clicks", "نقرات")], ["impressions", tt("Impressions", "ظهور")], ["ctr", "CTR %"]] as const).map(([k, l]) => (
                    <button key={k} onClick={() => setTrend(k)} style={{ padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none", background: trend === k ? trendColor : "transparent", color: trend === k ? "#fff" : "inherit" }}>{l}</button>
                  ))}
                </div>
              </div>
              <AreaChart labels={trendLabels} data={trendData} color={trendColor} unit={trend === "ctr" ? "%" : ""} />
            </div>
            {d?.site_url && <Text size="xsmall" className="text-ui-fg-muted mt-2">{tt("Property", "الموقع")}: {d.site_url}</Text>}
          </Container>

          {(topQ.length > 0 || topP.length > 0) && (
            <Container className="p-6 pt-0">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
                <Card title={tt("Top queries", "أعلى الكلمات")} sub={tt("by clicks", "حسب النقرات")} accent={C.teal}><BarList items={topQ} color={C.teal} /></Card>
                <Card title={tt("Top pages", "أعلى الصفحات")} sub={tt("by clicks", "حسب النقرات")} accent={C.violet}><BarList items={topP} color={C.violet} /></Card>
              </div>
            </Container>
          )}

          <Container className="p-6 pt-0">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Button size="small" variant={tab === "query" ? "primary" : "secondary"} onClick={() => { setTab("query"); setSort({ by: "clicks", dir: "desc" }) }}>{tt("Queries", "الكلمات")} <span className="opacity-60">({(d?.top_queries || []).length})</span></Button>
              <Button size="small" variant={tab === "page" ? "primary" : "secondary"} onClick={() => { setTab("page"); setSort({ by: "clicks", dir: "desc" }) }}>{tt("Pages", "الصفحات")} <span className="opacity-60">({(d?.top_pages || []).length})</span></Button>
            </div>
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ui-border-base p-8 text-center text-ui-fg-muted text-sm">
                {tt("Connected ✓ — but no data yet. Bing fills this in a few days after verification.", "متصل ✓ — لكن لا بيانات بعد. يملؤها Bing خلال أيام بعد التوثيق.")}
              </div>
            ) : (
              <div className="rounded-xl border border-ui-border-base bg-ui-bg-base overflow-hidden">
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell>{tab === "query" ? tt("Query", "الكلمة") : tt("Page", "الصفحة")}</Table.HeaderCell>
                      <Table.HeaderCell className="text-right cursor-pointer select-none" onClick={() => setSortCol("clicks")}>{tt("Clicks", "نقرات")}{arrow("clicks")}</Table.HeaderCell>
                      <Table.HeaderCell className="text-right cursor-pointer select-none" onClick={() => setSortCol("impressions")}>{tt("Impr.", "ظهور")}{arrow("impressions")}</Table.HeaderCell>
                      <Table.HeaderCell className="text-right cursor-pointer select-none" onClick={() => setSortCol("ctr")}>CTR{arrow("ctr")}</Table.HeaderCell>
                      <Table.HeaderCell className="text-right cursor-pointer select-none" onClick={() => setSortCol("position")}>{tt("Pos.", "ترتيب")}{arrow("position")}</Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {rows.slice(0, 100).map((r, i) => (
                      <Table.Row key={i}>
                        <Table.Cell className={tab === "page" ? "font-mono text-xs truncate max-w-[320px]" : "font-medium"} title={String((tab === "query" ? r.query : r.page) || "")}>{tab === "query" ? r.query : stripPage(String(r.page || ""))}</Table.Cell>
                        <Table.Cell className="text-right tabular-nums font-medium">{r.clicks.toLocaleString()}</Table.Cell>
                        <Table.Cell className="text-right tabular-nums text-ui-fg-subtle">{r.impressions.toLocaleString()}</Table.Cell>
                        <Table.Cell className="text-right tabular-nums">
                          <div className="inline-flex items-center gap-2 justify-end">
                            <div style={{ width: 44, height: 5, borderRadius: 3, background: "rgba(120,120,140,.2)", overflow: "hidden" }}><div style={{ width: `${Math.min(100, ctrOf(r) * 4)}%`, height: "100%", background: C.emerald }} /></div>
                            <span className="text-ui-fg-subtle" style={{ minWidth: 38, textAlign: "right" }}>{ctrOf(r)}%</span>
                          </div>
                        </Table.Cell>
                        <Table.Cell className="text-right tabular-nums"><Badge color={posColor(r.position)}>{r.position ? r.position.toFixed(1) : "—"}</Badge></Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
                {rows.length > 100 && <div className="text-ui-fg-muted text-center py-2" style={{ fontSize: 12 }}>{tt(`Showing top 100 of ${rows.length}`, `عرض أعلى 100 من ${rows.length}`)}</div>}
              </div>
            )}
          </Container>
        </>
      )}
    </SingleColumnPage>
  )
}

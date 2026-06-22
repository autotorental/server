import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text } from "@medusajs/ui"
import { ChartBar } from "@medusajs/icons"
import { API } from "../../lib/api"
import { tt } from "../../lib/lang"

export const config: RouteConfig = { label: tt("CF Web Analytics", "تحليلات الزوار"), icon: ChartBar, rank: 19 }

const num = (n: number) => (n || 0).toLocaleString()
const RANGES = [
  { k: "1d", l: tt("24h", "24 ساعة") },
  { k: "7d", l: tt("7 days", "7 أيام") },
  { k: "30d", l: tt("30 days", "30 يوم") },
]

// Hand-rolled area chart (no chart dep) — mirrors the Command Center look.
function AreaChart({ series, field, color, trendBy }: { series: any[]; field: string; color: string; trendBy: string }) {
  const W = 920, H = 220, pad = 46
  const vals = series.map((s) => s[field] || 0)
  const max = Math.max(1, ...vals)
  const n = series.length
  const X = (i: number) => pad + (i / Math.max(1, n - 1)) * (W - pad * 2)
  const Y = (v: number) => H - pad - (v / max) * (H - pad * 2)
  const line = (a: number[]) => a.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")
  const area = (a: number[]) => `${line(a)} L${X(n - 1).toFixed(1)},${H - pad} L${X(0).toFixed(1)},${H - pad} Z`
  const label = (t: string) => {
    try {
      const d = new Date(t)
      return trendBy === "date" ? `${d.getMonth() + 1}/${d.getDate()}` : `${d.getHours()}:00`
    } catch { return "" }
  }
  const gid = `cfwa-${field}`
  const every = Math.max(1, Math.round(n / 8))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.30" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {[0, 0.5, 1].map((q, i) => (<g key={i}><line x1={pad} x2={W - pad} y1={Y(max * q)} y2={Y(max * q)} stroke="rgba(125,125,125,.15)" /><text x={6} y={Y(max * q) + 3} fontSize="10" fill="#94a3b8">{Math.round(max * q).toLocaleString()}</text></g>))}
      <path d={area(vals)} fill={`url(#${gid})`} />
      <path d={line(vals)} fill="none" stroke={color} strokeWidth="2.4" />
      {series.map((s, i) => (i % every === 0 ? <text key={i} x={X(i)} y={H - 8} fontSize="9.5" fill="#94a3b8" textAnchor="middle">{label(s.t)}</text> : null))}
    </svg>
  )
}

function BarList({ title, rows, accent }: { title: string; rows: { name: string; loads: number; visits?: number }[]; accent: string }) {
  const max = Math.max(1, ...rows.map((r) => r.loads))
  return (
    <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4">
      <Heading level="h3" className="text-sm font-semibold mb-3">{title}</Heading>
      {rows.length === 0 ? (
        <Text className="text-ui-fg-muted text-sm">{tt("No data yet", "لا توجد بيانات بعد")}</Text>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <div key={i} className="relative">
              <div className="absolute inset-0 rounded-md" style={{ width: `${(r.loads / max) * 100}%`, background: accent, opacity: 0.12 }} />
              <div className="relative flex items-center justify-between px-2 py-1.5 text-sm">
                <span className="truncate text-ui-fg-base" style={{ maxWidth: "70%" }} title={r.name}>{r.name}</span>
                <span className="tabular-nums text-ui-fg-subtle">{num(r.loads)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const COUNTRY_NAME: Record<string, string> = {
  AE: "🇦🇪 UAE", SA: "🇸🇦 Saudi Arabia", US: "🇺🇸 United States", GB: "🇬🇧 UK", IN: "🇮🇳 India",
  EG: "🇪🇬 Egypt", QA: "🇶🇦 Qatar", KW: "🇰🇼 Kuwait", OM: "🇴🇲 Oman", BH: "🇧🇭 Bahrain",
  DE: "🇩🇪 Germany", FR: "🇫🇷 France", PK: "🇵🇰 Pakistan", RU: "🇷🇺 Russia", CN: "🇨🇳 China",
}

export default function Page() {
  const [d, setD] = useState<any>(null)
  const [range, setRange] = useState("7d")
  const [metric, setMetric] = useState<"loads" | "visits">("visits")
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")

  const load = async (r: string) => {
    setLoading(true); setErr("")
    try {
      const j = await fetch(`${API}/admin/cloudflare/web-analytics?range=${r}`, { credentials: "include" }).then((x) => x.json())
      if (j.ok) setD(j)
      else { setErr(j.error || "Failed"); setD(null) }
    } catch (e: any) { setErr(e?.message || "Failed") }
    setLoading(false)
  }
  useEffect(() => { load(range) }, [range])

  const t = d?.totals || {}
  const countries = (d?.countries || []).map((c: any) => ({ ...c, name: COUNTRY_NAME[c.name] || c.name }))

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div>
            <Heading level="h1" className="text-xl">{tt("Web Analytics — Real Visitors", "تحليلات الزوار الحقيقيين")}</Heading>
            <Text className="text-ui-fg-subtle text-sm">{tt("Live RUM data from Cloudflare — actual page loads & visits on autotorental.com.", "بيانات حقيقية من Cloudflare — مشاهدات وزيارات فعلية على autotorental.com.")}</Text>
          </div>
          <div className="flex items-center gap-1.5">
            {RANGES.map((r) => (
              <button key={r.k} onClick={() => setRange(r.k)}
                className={"px-3 py-1.5 text-sm rounded-lg border transition " + (range === r.k ? "border-ui-fg-interactive bg-ui-bg-subtle font-medium" : "border-ui-border-base text-ui-fg-subtle hover:border-ui-border-strong")}>
                {r.l}
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="rounded-xl border border-dashed border-ui-border-base bg-ui-bg-subtle p-8 text-center text-ui-fg-muted">{tt("Loading…", "جارٍ التحميل…")}</div>}
        {err && !loading && <div className="rounded-xl border border-ui-border-error bg-ui-bg-error-subtle p-4 text-ui-fg-error text-sm">{err}</div>}

        {d && !loading && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              <div className="rounded-xl border border-ui-border-base bg-ui-bg-base px-4 py-3.5">
                <span className="text-xs font-medium text-ui-fg-subtle">👁️ {tt("Page loads", "مرات التحميل")}</span>
                <div className="text-2xl font-semibold mt-1.5 tabular-nums">{num(t.pageLoads)}</div>
              </div>
              <div className="rounded-xl border border-ui-border-base bg-ui-bg-base px-4 py-3.5">
                <span className="text-xs font-medium text-ui-fg-subtle">🧍 {tt("Visits", "الزيارات")}</span>
                <div className="text-2xl font-semibold mt-1.5 tabular-nums" style={{ color: "#0ea5e9" }}>{num(t.visits)}</div>
              </div>
              <div className="rounded-xl border border-ui-border-base bg-ui-bg-base px-4 py-3.5">
                <span className="text-xs font-medium text-ui-fg-subtle">📄 {tt("Loads / visit", "تحميل/زيارة")}</span>
                <div className="text-2xl font-semibold mt-1.5 tabular-nums">{t.visits ? (t.pageLoads / t.visits).toFixed(1) : "—"}</div>
              </div>
              <div className="rounded-xl border border-ui-border-base bg-ui-bg-base px-4 py-3.5">
                <span className="text-xs font-medium text-ui-fg-subtle">🤖 {tt("Bot traffic", "زيارات الروبوتات")}</span>
                <div className="text-2xl font-semibold mt-1.5 tabular-nums" style={{ color: t.botPct > 30 ? "#d97706" : undefined }}>{t.botPct}%</div>
              </div>
            </div>

            {/* Trend */}
            <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4 mb-5">
              <div className="flex items-center justify-between mb-2">
                <Heading level="h3" className="text-sm font-semibold">{tt("Traffic over time", "حركة الزوار عبر الوقت")}</Heading>
                <div className="flex items-center gap-1.5">
                  {(["visits", "loads"] as const).map((m) => (
                    <button key={m} onClick={() => setMetric(m)}
                      className={"px-2.5 py-1 text-xs rounded-md border transition " + (metric === m ? "border-ui-fg-interactive bg-ui-bg-subtle font-medium" : "border-ui-border-base text-ui-fg-subtle")}>
                      {m === "visits" ? tt("Visits", "الزيارات") : tt("Loads", "التحميلات")}
                    </button>
                  ))}
                </div>
              </div>
              <AreaChart series={d.trend || []} field={metric} color={metric === "visits" ? "#0ea5e9" : "#f6821f"} trendBy={d.trendBy} />
            </div>

            {/* Breakdowns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <BarList title={"📄 " + tt("Top pages", "أكثر الصفحات")} rows={d.pages || []} accent="#6366f1" />
              <BarList title={"🌍 " + tt("Top countries", "أكثر الدول")} rows={countries} accent="#22c55e" />
              <BarList title={"💻 " + tt("Devices", "الأجهزة")} rows={d.devices || []} accent="#0ea5e9" />
              <BarList title={"🧭 " + tt("Browsers", "المتصفحات")} rows={d.browsers || []} accent="#f59e0b" />
              <BarList title={"🖥️ " + tt("Operating systems", "أنظمة التشغيل")} rows={d.os || []} accent="#a855f7" />
              <BarList title={"🔗 " + tt("Top referrers", "مصادر الزيارات")} rows={d.referrers || []} accent="#ec4899" />
            </div>
          </>
        )}
      </Container>
    </SingleColumnPage>
  )
}

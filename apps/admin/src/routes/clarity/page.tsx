import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button } from "@medusajs/ui"
import { Eye } from "@medusajs/icons"
import { tt } from "../../lib/lang"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("Clarity", "تحليلات السلوك"), icon: Eye, rank: 27 }

const num = (n: number) => (n || 0).toLocaleString()
const RANGES = [
  { k: "1d", l: tt("24h", "24 ساعة") },
  { k: "3d", l: tt("3 days", "3 أيام") },
  { k: "7d", l: tt("7 days", "7 أيام") },
  { k: "30d", l: tt("30 days", "30 يوم") },
]
const FLAG: Record<string, string> = { AE: "🇦🇪", SA: "🇸🇦", US: "🇺🇸", GB: "🇬🇧", IN: "🇮🇳", EG: "🇪🇬", QA: "🇶🇦", KW: "🇰🇼", OM: "🇴🇲", BH: "🇧🇭", DE: "🇩🇪", FR: "🇫🇷", PK: "🇵🇰", RU: "🇷🇺", CN: "🇨🇳", SY: "🇸🇾", TR: "🇹🇷" }
const devIcon = (d: string) => (/mobile/i.test(d) ? "📱" : /tablet/i.test(d) ? "📒" : "💻")

function Area({ series, field, color }: { series: any[]; field: string; color: string }) {
  const W = 900, H = 150, pad = 34
  const vals = series.map((s) => +s[field] || 0)
  const max = Math.max(1, ...vals); const n = series.length
  const X = (i: number) => pad + (i / Math.max(1, n - 1)) * (W - pad * 2)
  const Y = (v: number) => H - 22 - (v / max) * (H - 40)
  const line = (a: number[]) => a.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")
  const area = `${line(vals)} L${X(n - 1).toFixed(1)},${H - 22} L${X(0).toFixed(1)},${H - 22} Z`
  const every = Math.max(1, Math.round(n / 8))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      <defs><linearGradient id={`cl-${field}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.28" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill={`url(#cl-${field})`} /><path d={line(vals)} fill="none" stroke={color} strokeWidth="2.4" />
      {series.map((s, i) => (i % every === 0 ? <text key={i} x={X(i)} y={H - 6} fontSize="9.5" fill="#94a3b8" textAnchor="middle">{s.t}</text> : null))}
    </svg>
  )
}

function BarList({ title, rows, accent, fmtName }: { title: string; rows: any[]; accent: string; fmtName?: (r: any) => string }) {
  const max = Math.max(1, ...rows.map((r) => +r.sessions || +r.views || 0))
  return (
    <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4">
      <Heading level="h3" className="text-sm font-semibold mb-3">{title}</Heading>
      {rows.length === 0 ? <Text className="text-ui-fg-muted text-sm">{tt("No data yet", "لا توجد بيانات بعد")}</Text> : (
        <div className="flex flex-col gap-2">
          {rows.map((r, i) => { const v = +r.sessions || +r.views || 0; return (
            <div key={i} className="relative">
              <div className="absolute inset-0 rounded-md" style={{ width: `${(v / max) * 100}%`, background: accent, opacity: 0.12 }} />
              <div className="relative flex items-center justify-between px-2 py-1.5 text-sm">
                <span className="truncate text-ui-fg-base" style={{ maxWidth: "72%" }} title={r.name}>{fmtName ? fmtName(r) : r.name}</span>
                <span className="tabular-nums text-ui-fg-subtle">{num(v)}</span>
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  )
}

function Insight({ emoji, label, desc, pct, sessions, color }: any) {
  return (
    <a href="/dashboard/recordings" className="flex items-center gap-3 rounded-lg border border-ui-border-base bg-ui-bg-base px-3 py-2.5 hover:border-ui-border-strong transition-colors">
      <div className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 38, height: 38, fontSize: 18, background: `${color}1f` }}>{emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold tabular-nums" style={{ color }}>{pct}%</span>
          <span className="text-sm font-medium text-ui-fg-base truncate">{label}</span>
        </div>
        <Text size="xsmall" className="text-ui-fg-muted">{num(sessions)} {tt("sessions", "جلسة")} · {desc}</Text>
      </div>
      <span className="text-ui-fg-interactive text-lg">▶</span>
    </a>
  )
}

export default function ClarityPage() {
  const [d, setD] = useState<any>(null)
  const [range, setRange] = useState("3d")
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")

  useEffect(() => {
    let alive = true; setLoading(true); setErr("")
    fetch(`${API}/admin/analytics/behavior?range=${range}`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => { if (!alive) return; if (j.ok) setD(j); else setErr(j.error || "Failed") })
      .catch((e) => alive && setErr(e?.message || "Failed"))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [range])

  const u = d?.users || {}
  const ins = d?.insights || {}
  const total = (u.new_users || 0) + (u.returning_users || 0)
  const newPct = total ? Math.round((u.new_users / total) * 100) : 0

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div>
            <Heading level="h1" className="text-xl">{tt("Behaviour Analytics", "تحليلات السلوك")} <span className="text-ui-fg-muted text-sm">· {tt("native", "أصلي")}</span></Heading>
            <Text className="text-ui-fg-subtle text-sm">{tt("Real visitor behaviour on autotorental.com — sessions, frustration signals & recordings, inside your dashboard.", "سلوك الزوّار الحقيقي على autotorental.com — جلسات وإشارات إحباط وتسجيلات، داخل لوحتك.")}</Text>
          </div>
          <div className="flex items-center gap-1.5">
            {RANGES.map((r) => (
              <button key={r.k} onClick={() => setRange(r.k)} className={"px-3 py-1.5 text-sm rounded-lg border transition " + (range === r.k ? "border-ui-fg-interactive bg-ui-bg-subtle font-medium" : "border-ui-border-base text-ui-fg-subtle hover:border-ui-border-strong")}>{r.l}</button>
            ))}
          </div>
        </div>

        {loading && <div className="rounded-xl border border-dashed border-ui-border-base bg-ui-bg-subtle p-8 text-center text-ui-fg-muted">{tt("Loading…", "جارٍ التحميل…")}</div>}
        {err && !loading && <div className="rounded-xl border border-ui-border-error bg-ui-bg-error-subtle p-4 text-ui-fg-error text-sm">{err}</div>}

        {d && !loading && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              <div className="rounded-xl border border-ui-border-base bg-ui-bg-base px-4 py-3.5"><span className="text-xs font-medium text-ui-fg-subtle">🧍 {tt("Sessions", "الجلسات")}</span><div className="text-2xl font-semibold mt-1.5 tabular-nums">{num(u.sessions)}</div></div>
              <div className="rounded-xl border border-ui-border-base bg-ui-bg-base px-4 py-3.5"><span className="text-xs font-medium text-ui-fg-subtle">👁️ {tt("Pageviews", "المشاهدات")}</span><div className="text-2xl font-semibold mt-1.5 tabular-nums">{num(u.pageviews)}</div></div>
              <div className="rounded-xl border border-ui-border-base bg-ui-bg-base px-4 py-3.5"><span className="text-xs font-medium text-ui-fg-subtle">🟢 {tt("Live now", "الآن مباشر")}</span><div className="text-2xl font-semibold mt-1.5 tabular-nums" style={{ color: u.live > 0 ? "#16a34a" : undefined }}>{num(u.live)}</div></div>
              <div className="rounded-xl border border-ui-border-base bg-ui-bg-base px-4 py-3.5"><span className="text-xs font-medium text-ui-fg-subtle">🆕 {tt("New visitors", "زوّار جدد")}</span><div className="text-2xl font-semibold mt-1.5 tabular-nums">{newPct}%</div></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
              {/* Users overview */}
              <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4">
                <Heading level="h3" className="text-sm font-semibold mb-3">👥 {tt("Users overview", "نظرة على المستخدمين")}</Heading>
                <div className="flex items-center justify-between mb-3">
                  <div><div className="text-2xl font-bold tabular-nums">{num(u.sessions)}</div><Text size="xsmall" className="text-ui-fg-muted">{tt("unique sessions", "جلسات فريدة")}</Text></div>
                  <div className="text-right"><div className="text-2xl font-bold tabular-nums" style={{ color: u.live > 0 ? "#16a34a" : undefined }}>{num(u.live)}</div><Text size="xsmall" className="text-ui-fg-muted">{tt("live now", "مباشر الآن")}</Text></div>
                </div>
                <div className="h-3 rounded-full overflow-hidden flex mb-2" style={{ background: "rgba(120,120,140,.12)" }}>
                  <div style={{ width: `${newPct}%`, background: "#ec4899" }} /><div style={{ width: `${100 - newPct}%`, background: "#6366f1" }} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full" style={{ background: "#ec4899" }} />{tt("New", "جدد")} {num(u.new_users)}</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full" style={{ background: "#6366f1" }} />{tt("Returning", "عائدون")} {num(u.returning_users)}</span>
                </div>
                {u.topUser && (
                  <div className="mt-3 pt-3 border-t border-ui-border-base flex items-center justify-between">
                    <Text size="small" className="text-ui-fg-subtle">⭐ {tt("Top visitor", "أكثر زائر")}</Text>
                    <Text size="small" className="font-medium">{FLAG[u.topUser.country] || "🌍"} {u.topUser.country} · {devIcon(u.topUser.device)} · {num(u.topUser.views)} {tt("views", "مشاهدة")}</Text>
                  </div>
                )}
              </div>

              {/* Insights */}
              <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4">
                <div className="flex items-center justify-between mb-3">
                  <Heading level="h3" className="text-sm font-semibold">🔎 {tt("Frustration insights", "إشارات الإحباط")}</Heading>
                  <Text size="xsmall" className="text-ui-fg-muted">{tt(`from ${ins.scanned || 0} recorded sessions`, `من ${ins.scanned || 0} جلسة مسجّلة`)}</Text>
                </div>
                <div className="flex flex-col gap-2">
                  <Insight emoji="😡" color="#ef4444" label={tt("Rage clicks", "نقرات غاضبة")} desc={tt("3+ fast clicks, same spot", "3+ نقرات سريعة بنفس المكان")} pct={ins.rage?.pct || 0} sessions={ins.rage?.sessions || 0} />
                  <Insight emoji="💀" color="#a855f7" label={tt("Dead clicks", "نقرات ميتة")} desc={tt("click with no reaction", "نقرة بلا استجابة")} pct={ins.dead?.pct || 0} sessions={ins.dead?.sessions || 0} />
                  <Insight emoji="🌀" color="#0ea5e9" label={tt("Excessive scrolling", "تمرير مفرط")} desc={tt("lots of up/down scrolling", "تمرير كثير صعودًا وهبوطًا")} pct={ins.scroll?.pct || 0} sessions={ins.scroll?.sessions || 0} />
                  <Insight emoji="↩️" color="#f59e0b" label={tt("Quick backs", "ارتداد سريع")} desc={tt("left within 8 seconds", "غادر خلال 8 ثوانٍ")} pct={ins.quick?.pct || 0} sessions={ins.quick?.sessions || 0} />
                </div>
              </div>
            </div>

            {/* Trend */}
            <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4 mb-3">
              <Heading level="h3" className="text-sm font-semibold mb-2">📈 {tt("Sessions over time", "الجلسات عبر الوقت")}</Heading>
              <Area series={d.trend || []} field="sessions" color="#6366f1" />
            </div>

            {/* Breakdowns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <BarList title={"📄 " + tt("Top pages", "أكثر الصفحات")} rows={d.topPages || []} accent="#6366f1" />
              <BarList title={"🌍 " + tt("Top countries", "أكثر الدول")} rows={d.topCountries || []} accent="#22c55e" fmtName={(r) => `${FLAG[r.name] || "🌍"} ${r.name}`} />
              <BarList title={"💻 " + tt("Devices", "الأجهزة")} rows={d.devices || []} accent="#0ea5e9" fmtName={(r) => `${devIcon(r.name)} ${r.name}`} />
              <BarList title={"🧭 " + tt("Browsers", "المتصفحات")} rows={d.browsers || []} accent="#f59e0b" />
            </div>

            <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
              <a href="/dashboard/recordings"><Button variant="primary" size="small">🎬 {tt("Watch session recordings", "شاهد تسجيلات الجلسات")}</Button></a>
              <a href="https://clarity.microsoft.com/projects/view/x0jhbzv0a4/dashboard" target="_blank" rel="noopener"><Button variant="secondary" size="small">{tt("Open Microsoft Clarity (heatmaps) ↗", "افتح Microsoft Clarity (خرائط حرارية) ↗")}</Button></a>
            </div>
          </>
        )}
      </Container>
    </SingleColumnPage>
  )
}

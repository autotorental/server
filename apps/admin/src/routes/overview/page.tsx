import { useEffect, useMemo, useRef, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Button } from "@medusajs/ui"
import {
  Buildings, HandTruck, CurrencyDollar, ChartBar, MagnifyingGlass, Bolt, Eye,
  CheckCircleSolid, Clock, Plus, Trash, PencilSquare, ArrowUpRightOnBox, Users,
} from "@medusajs/icons"
import { Link } from "react-router-dom"
import { API } from "../../lib/api"
import { tt } from "../../lib/lang"

// Professional platform "Command Center" — KPIs + live SVG charts (no chart
// dependency), drag-to-reorder cards, layout saved to the server, and an
// "add any chart" builder that includes Google Search Console + Google
// Analytics (GA4) with every metric the property exposes.
export const config: RouteConfig = { label: tt("Overview", "نظرة عامة"), icon: Buildings, rank: 1 }

const C = { blue: "#3b82f6", violet: "#8b5cf6", emerald: "#10b981", amber: "#f59e0b", pink: "#ec4899", cyan: "#06b6d4", slate: "#64748b" }
const PAL = [C.blue, C.violet, C.emerald, C.amber, C.pink, C.cyan, C.slate]
const fmt = (n: number) => (n >= 1000 ? n.toLocaleString() : String(n))
const aed = (n: number) => "AED " + Math.round(n).toLocaleString()
const fmtGaDate = (k: string) => (k && k.length === 8 ? `${k.slice(4, 6)}-${k.slice(6, 8)}` : k)

// ---------------------------------------------------------------- charts (SVG)
function AreaChart({ series, labels, height = 190 }: { series: { name: string; color: string; data: number[] }[]; labels: string[]; height?: number }) {
  const [hi, setHi] = useState<number | null>(null)
  const W = 800, H = height, P = { l: 6, r: 6, t: 14, b: 20 }
  const n = Math.max(1, ...series.map((s) => s.data.length))
  const max = Math.max(1, ...series.flatMap((s) => s.data))
  const x = (i: number) => P.l + (i * (W - P.l - P.r)) / Math.max(1, n - 1)
  const y = (v: number) => P.t + (1 - v / max) * (H - P.t - P.b)
  const line = (d: number[]) => d.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")
  const area = (d: number[]) => `${line(d)} L${x(n - 1)},${H - P.b} L${x(0)},${H - P.b} Z`
  if (!series.length || n < 2) return <div className="text-ui-fg-muted text-sm py-10 text-center">{tt("No data yet", "لا توجد بيانات بعد")}</div>
  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height }} onMouseLeave={() => setHi(null)}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={i} id={`g${i}-${s.name}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={P.l} x2={W - P.r} y1={P.t + g * (H - P.t - P.b)} y2={P.t + g * (H - P.t - P.b)} stroke="currentColor" strokeOpacity="0.08" />)}
        {series.map((s, i) => <path key={`a${i}`} d={area(s.data)} fill={`url(#g${i}-${s.name})`} />)}
        {series.map((s, i) => <path key={`l${i}`} d={line(s.data)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />)}
        {hi !== null && <line x1={x(hi)} x2={x(hi)} y1={P.t} y2={H - P.b} stroke="currentColor" strokeOpacity="0.25" />}
        {hi !== null && series.map((s, i) => <circle key={`d${i}`} cx={x(hi)} cy={y(s.data[hi] || 0)} r="3.5" fill={s.color} stroke="#fff" strokeWidth="1.5" />)}
        {Array.from({ length: n }).map((_, i) => <rect key={i} x={x(i) - (W / n) / 2} y={0} width={W / n} height={H} fill="transparent" onMouseEnter={() => setHi(i)} />)}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, opacity: 0.55, marginTop: 2 }}>
        <span>{labels[0]}</span><span>{labels[Math.floor(labels.length / 2)]}</span><span>{labels[labels.length - 1]}</span>
      </div>
      {hi !== null && (
        <div style={{ position: "absolute", top: 6, left: `${(x(hi) / W) * 100}%`, transform: "translateX(-50%)", pointerEvents: "none", background: "rgba(15,23,42,.92)", color: "#fff", borderRadius: 8, padding: "6px 9px", fontSize: 11, whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(0,0,0,.3)" }}>
          <div style={{ opacity: 0.7, marginBottom: 2 }}>{labels[hi]}</div>
          {series.map((s, i) => <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ width: 8, height: 8, borderRadius: 9, background: s.color, display: "inline-block" }} />{s.name}: <b>{fmt(s.data[hi] || 0)}</b></div>)}
        </div>
      )}
    </div>
  )
}

function Donut({ segments, size = 150 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((a, b) => a + b.value, 0)
  const r = 54, cx = 70, cy = 70, circ = 2 * Math.PI * r
  let acc = 0
  return (
    <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
      <svg viewBox="0 0 140 140" style={{ width: size, height: size, flex: "none" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="16" />
        {total > 0 && segments.map((s, i) => {
          const len = (s.value / total) * circ
          const el = <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth="16" strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-acc} transform="rotate(-90 70 70)" strokeLinecap="butt" />
          acc += len
          return el
        })}
        <text x="70" y="66" textAnchor="middle" fontSize="22" fontWeight="800" fill="currentColor">{fmt(total)}</text>
        <text x="70" y="84" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.55">{tt("total", "الإجمالي")}</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 120 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
            <span style={{ flex: 1 }}>{s.label}</span>
            <b style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(s.value)}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

function BarList({ items }: { items: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  if (!items.length) return <div className="text-ui-fg-muted text-sm py-6 text-center">{tt("No data yet", "لا توجد بيانات بعد")}</div>
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 120, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={it.label}>{it.label}</span>
          <div style={{ flex: 1, height: 10, borderRadius: 6, background: "rgba(120,120,140,.12)", overflow: "hidden" }}>
            <div style={{ width: `${(it.value / max) * 100}%`, height: "100%", borderRadius: 6, background: `linear-gradient(90deg, ${it.color || C.blue}, ${it.color || C.violet})` }} />
          </div>
          <b style={{ width: 64, textAlign: "right", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{fmt(it.value)}</b>
        </div>
      ))}
    </div>
  )
}

// --------------------------------------------------------------- presentational
function Panel({ title, subtitle, accent, children, onRemove, dragging }: { title: string; subtitle?: string; accent?: string; children: any; onRemove?: () => void; dragging?: boolean }) {
  return (
    <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", borderRadius: 16, padding: 18, border: "1px solid rgba(120,120,140,.16)", boxShadow: dragging ? "0 8px 28px rgba(0,0,0,.18)" : "0 1px 2px rgba(0,0,0,.04)", overflow: "hidden" }} className="bg-ui-bg-base">
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent || C.blue}, transparent)` }} />
      <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: 14, gap: 8, minHeight: 38 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
          {subtitle && <div className="text-ui-fg-muted" style={{ fontSize: 11.5, marginTop: 2 }}>{subtitle}</div>}
        </div>
        {onRemove && <button onClick={onRemove} title="Remove" style={{ opacity: 0.5, cursor: "pointer", background: "none", border: "none", flex: "none" }}><Trash /></button>}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 200 }}>{children}</div>
    </div>
  )
}

function StatCard({ icon, label, value, accent, footer }: { icon: any; label: string; value: any; accent: string; footer?: string }) {
  return (
    <div style={{ position: "relative", borderRadius: 16, padding: "16px 18px", overflow: "hidden", background: `linear-gradient(135deg, ${accent}1f, ${accent}08)`, border: `1px solid ${accent}33` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: accent, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>
        <span style={{ display: "inline-flex" }}>{icon}</span>{label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {footer && <div className="text-ui-fg-muted" style={{ fontSize: 11.5, marginTop: 2 }}>{footer}</div>}
    </div>
  )
}

// ----------------------------------------------------------------------- GA4
const GA4_FALLBACK_METRICS = [
  { name: "activeUsers", label: "Active users" }, { name: "newUsers", label: "New users" }, { name: "totalUsers", label: "Total users" },
  { name: "sessions", label: "Sessions" }, { name: "engagedSessions", label: "Engaged sessions" }, { name: "screenPageViews", label: "Page views" },
  { name: "eventCount", label: "Events" }, { name: "conversions", label: "Conversions" }, { name: "averageSessionDuration", label: "Avg session duration" },
  { name: "bounceRate", label: "Bounce rate" }, { name: "engagementRate", label: "Engagement rate" }, { name: "screenPageViewsPerUser", label: "Views per user" },
  { name: "totalRevenue", label: "Total revenue" }, { name: "userEngagementDuration", label: "Engagement time" },
]
const GA4_FALLBACK_DIMS = [
  { name: "date", label: "Date (time series)" }, { name: "country", label: "Country" }, { name: "deviceCategory", label: "Device" },
  { name: "pagePath", label: "Page" }, { name: "sessionDefaultChannelGroup", label: "Channel" }, { name: "sessionSource", label: "Source" },
  { name: "browser", label: "Browser" }, { name: "city", label: "City" }, { name: "landingPage", label: "Landing page" }, { name: "eventName", label: "Event" },
]

// Plain-language, bilingual names + a one-line "what it shows" for GA4 metrics &
// dimensions. GA4's own names ("Return on ad spend", "WAU / MAU", "Sessions per
// user", "Key event count for add_to_cart") are jargon to most owners — we map
// the common ones to a clear label + a short explanation, shown in the chart
// picker AND on the chart title/subtitle. Unmapped names fall back to GA4's own
// uiName (and its English description, if the API provides one).
const GA4_FRIENDLY: Record<string, { label: [string, string]; desc: [string, string] }> = {
  // ---- people
  activeUsers: { label: ["Active visitors", "الزوّار النشطون"], desc: ["People who actually used the site in the period", "عدد الأشخاص الذين استخدموا الموقع فعلاً خلال الفترة"] },
  totalUsers: { label: ["Total visitors", "إجمالي الزوّار"], desc: ["All unique people who visited", "كل الأشخاص الفريدين الذين زاروا"] },
  newUsers: { label: ["New visitors", "زوّار جدد"], desc: ["People visiting for the first time", "أشخاص يزورون لأول مرة"] },
  active1DayUsers: { label: ["Daily active (DAU)", "النشطون يومياً"], desc: ["People active in the last day", "النشطون خلال آخر يوم"] },
  active7DayUsers: { label: ["Weekly active (WAU)", "النشطون أسبوعياً"], desc: ["People active in the last 7 days", "النشطون خلال آخر 7 أيام"] },
  active28DayUsers: { label: ["Monthly active (MAU)", "النشطون شهرياً"], desc: ["People active in the last 28 days", "النشطون خلال آخر 28 يوماً"] },
  dauPerMau: { label: ["Daily ÷ monthly stickiness", "الالتصاق اليومي ÷ الشهري"], desc: ["Of monthly visitors, the share who come daily — higher = stickier", "من زوّار الشهر، نسبة من يأتون يومياً — كلما زادت زاد الالتصاق"] },
  dauPerWau: { label: ["Daily ÷ weekly stickiness", "الالتصاق اليومي ÷ الأسبوعي"], desc: ["Of weekly visitors, the share who come daily", "من زوّار الأسبوع، نسبة من يأتون يومياً"] },
  wauPerMau: { label: ["Weekly ÷ monthly stickiness", "الالتصاق الأسبوعي ÷ الشهري"], desc: ["Of monthly visitors, the share who also come weekly", "من زوّار الشهر، نسبة من يأتون أسبوعياً أيضاً"] },
  // ---- visits / engagement
  sessions: { label: ["Visits", "الزيارات"], desc: ["Number of times the site was visited", "عدد مرات زيارة الموقع"] },
  engagedSessions: { label: ["Engaged visits", "زيارات متفاعلة"], desc: ["Visits over 10s, with a conversion, or 2+ pages", "زيارات تجاوزت 10ث أو فيها تحويل أو صفحتان فأكثر"] },
  sessionsPerUser: { label: ["Visits per visitor", "زيارات لكل زائر"], desc: ["How often each person comes back on average", "كم مرة يعود كل شخص وسطياً"] },
  engagementRate: { label: ["Engagement rate", "معدل التفاعل"], desc: ["Share of visits that were engaged (the good ones)", "نسبة الزيارات المتفاعلة (الجيّدة)"] },
  bounceRate: { label: ["Bounce rate", "معدل الارتداد"], desc: ["Share who left after one page with no action — lower is better", "نسبة من غادروا بعد صفحة واحدة دون تفاعل — كلما قلّت كان أفضل"] },
  averageSessionDuration: { label: ["Avg visit length", "متوسط مدة الزيارة"], desc: ["How long a visit lasts on average", "متوسط طول الزيارة الواحدة"] },
  userEngagementDuration: { label: ["Total time on site", "إجمالي وقت التصفّح"], desc: ["Total active time visitors spent", "إجمالي الوقت الفعلي الذي قضاه الزوّار"] },
  // ---- pages
  screenPageViews: { label: ["Page views", "مشاهدات الصفحات"], desc: ["Total number of pages opened", "إجمالي عدد الصفحات التي فُتحت"] },
  screenPageViewsPerUser: { label: ["Pages per visitor", "صفحات لكل زائر"], desc: ["Average pages each person opened", "متوسط الصفحات لكل شخص"] },
  screenPageViewsPerSession: { label: ["Pages per visit", "صفحات لكل زيارة"], desc: ["Average pages opened in one visit", "متوسط الصفحات في الزيارة الواحدة"] },
  // ---- actions / conversions
  eventCount: { label: ["Actions (events)", "التفاعلات (الأحداث)"], desc: ["Total tracked interactions (clicks, views, etc.)", "إجمالي التفاعلات المسجّلة (نقرات، مشاهدات…)"] },
  eventCountPerUser: { label: ["Actions per visitor", "تفاعلات لكل زائر"], desc: ["Average tracked actions per person", "متوسط التفاعلات لكل شخص"] },
  conversions: { label: ["Conversions", "التحويلات"], desc: ["Completed goals like sign-ups or contacts", "أهداف مكتملة مثل التسجيل أو التواصل"] },
  keyEvents: { label: ["Key conversions", "التحويلات المهمّة"], desc: ["Important goals you marked as key events", "الأهداف المهمّة التي حدّدتها"] },
  // ---- money
  totalRevenue: { label: ["Revenue", "الإيراد"], desc: ["Total money earned in the period", "إجمالي المال المكتسب خلال الفترة"] },
  purchaseRevenue: { label: ["Purchase revenue", "إيراد الشراء"], desc: ["Money from purchases only", "المال من عمليات الشراء فقط"] },
  averagePurchaseRevenue: { label: ["Avg order value", "متوسط قيمة الطلب"], desc: ["Average money per purchase", "متوسط المال في عملية الشراء"] },
  transactions: { label: ["Transactions", "المعاملات"], desc: ["Number of completed purchases", "عدد عمليات الشراء المكتملة"] },
  ecommercePurchases: { label: ["Purchases", "عمليات الشراء"], desc: ["Number of purchase events", "عدد أحداث الشراء"] },
  // ---- ads
  returnOnAdSpend: { label: ["Return on ad spend (ROAS)", "العائد على الإنفاق الإعلاني"], desc: ["Revenue earned for every 1 spent on ads", "الإيراد مقابل كل 1 يُنفق على الإعلانات"] },
  advertiserAdCost: { label: ["Ad cost", "تكلفة الإعلانات"], desc: ["Total money spent on ads", "إجمالي ما أُنفق على الإعلانات"] },
  advertiserAdClicks: { label: ["Ad clicks", "نقرات الإعلانات"], desc: ["Clicks on your ads", "النقرات على إعلاناتك"] },
  advertiserAdImpressions: { label: ["Ad impressions", "ظهور الإعلانات"], desc: ["Times your ads were shown", "عدد مرات عرض إعلاناتك"] },
  // ---- dimensions
  date: { label: ["Over time (by day)", "عبر الزمن (يومياً)"], desc: ["Trend day by day", "الاتجاه يوماً بيوم"] },
  country: { label: ["Country", "الدولة"], desc: ["Where visitors are located", "موقع الزوّار حسب الدولة"] },
  city: { label: ["City", "المدينة"], desc: ["Visitor cities", "مدن الزوّار"] },
  deviceCategory: { label: ["Device type", "نوع الجهاز"], desc: ["Mobile, desktop or tablet", "جوال أو حاسوب أو لوحي"] },
  pagePath: { label: ["Page", "الصفحة"], desc: ["Which pages were viewed", "الصفحات التي شوهدت"] },
  pageTitle: { label: ["Page title", "عنوان الصفحة"], desc: ["Viewed pages by their title", "الصفحات المشاهدة حسب عنوانها"] },
  landingPage: { label: ["Entry page", "صفحة الدخول"], desc: ["The first page visitors land on", "أول صفحة يدخل منها الزوّار"] },
  sessionDefaultChannelGroup: { label: ["Traffic channel", "قناة الزيارات"], desc: ["How visitors arrived: search, social, direct…", "كيف وصل الزوّار: بحث، تواصل، مباشر…"] },
  sessionSource: { label: ["Source", "المصدر"], desc: ["Which site/app sent the visitor", "الموقع/التطبيق الذي أرسل الزائر"] },
  sessionMedium: { label: ["Medium", "الوسيط"], desc: ["Type of traffic (organic, cpc, referral…)", "نوع الزيارة (مجاني، مدفوع، إحالة…)"] },
  sessionSourceMedium: { label: ["Source / medium", "المصدر/الوسيط"], desc: ["Source and medium combined", "المصدر والوسيط معاً"] },
  sessionCampaignName: { label: ["Campaign", "الحملة"], desc: ["Marketing campaign that brought visitors", "الحملة التسويقية التي جلبت الزوّار"] },
  firstUserDefaultChannelGroup: { label: ["First-touch channel", "قناة أول وصول"], desc: ["How visitors first discovered you", "كيف اكتشفك الزوّار أول مرة"] },
  browser: { label: ["Browser", "المتصفّح"], desc: ["Chrome, Safari, etc.", "كروم، سفاري…"] },
  operatingSystem: { label: ["Operating system", "نظام التشغيل"], desc: ["iOS, Android, Windows…", "iOS، أندرويد، ويندوز…"] },
  language: { label: ["Language", "اللغة"], desc: ["Visitor browser language", "لغة متصفّح الزائر"] },
  eventName: { label: ["Action name", "اسم التفاعل"], desc: ["Breakdown by interaction type", "التوزيع حسب نوع التفاعل"] },
  newVsReturning: { label: ["New vs returning", "جديد مقابل عائد"], desc: ["First-time vs repeat visitors", "زوّار لأول مرة مقابل عائدين"] },
}

// Map a GA4 apiName (or uiName fallback) → a clear label + one-line description
// in the active language. Handles dynamic per-event metrics (keyEvents:add_to_cart…).
function ga4Friendly(name: string, fallbackLabel?: string): { label: string; desc: string } {
  const hit = GA4_FRIENDLY[name]
  if (hit) return { label: tt(hit.label[0], hit.label[1]), desc: tt(hit.desc[0], hit.desc[1]) }
  const c = name.indexOf(":")
  if (c > 0) {
    const base = name.slice(0, c), ev = name.slice(c + 1)
    if (base === "keyEvents") return { label: tt(`Conversion · ${ev}`, `تحويل · ${ev}`), desc: tt(`How many times the “${ev}” goal happened`, `كم مرة تحقّق الهدف “${ev}”`) }
    if (base === "sessionKeyEventRate") return { label: tt(`Conversion rate · ${ev}`, `معدل تحويل · ${ev}`), desc: tt(`Share of visits that completed “${ev}”`, `نسبة الزيارات التي أتمّت “${ev}”`) }
    if (base === "customEvent") return { label: tt(`Event · ${ev}`, `حدث · ${ev}`), desc: tt(`How many times “${ev}” happened`, `كم مرة حدث “${ev}”`) }
  }
  return { label: fallbackLabel || name, desc: "" }
}

function Ga4Connect({ data }: { data: any }) {
  return (
    <div className="text-ui-fg-muted" style={{ fontSize: 13, padding: "14px 4px" }}>
      <div style={{ marginBottom: 8 }}>{tt("Google Analytics isn't connected yet.", "لم يُربط Google Analytics بعد.")}</div>
      {data?.reason === "permission" && data?.sa_email && (
        <div style={{ background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.3)", borderRadius: 10, padding: "10px 12px", color: "inherit" }}>
          {tt("Grant this service account Viewer access on GA4 property", "امنح حساب الخدمة هذا صلاحية Viewer على GA4 property")} <b>{data.property_id}</b>:
          <code style={{ display: "block", marginTop: 6, fontSize: 12, wordBreak: "break-all" }}>{data.sa_email}</code>
          <div style={{ marginTop: 6, opacity: 0.8 }}>{tt("GA4 Admin → Property Access Management → +", "GA4 Admin → Property Access Management → +")}</div>
        </div>
      )}
      {data?.message && data?.reason !== "permission" && <div style={{ opacity: 0.8 }}>{data.message}</div>}
    </div>
  )
}

function Ga4Chart({ metric, dimension, days, label, color }: { metric: string; dimension: string; days: number; label: string; color: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`${API}/admin/analytics/ga4?metric=${encodeURIComponent(metric)}&dimension=${encodeURIComponent(dimension)}&days=${days}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setData(d) })
      .catch(() => { if (alive) setData({ connected: false, message: "Request failed" }) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [metric, dimension, days])
  if (loading) return <div className="text-ui-fg-muted text-sm py-10 text-center">{tt("Loading…", "جارٍ التحميل…")}</div>
  if (!data || !data.connected) return <Ga4Connect data={data} />
  const rows = data.rows || []
  if (dimension === "date") {
    return <AreaChart labels={rows.map((r: any) => fmtGaDate(r.key))} series={[{ name: label, color, data: rows.map((r: any) => r.value) }]} />
  }
  return <BarList items={rows.map((r: any, i: number) => ({ label: r.key || "(n/a)", value: r.value, color: PAL[i % PAL.length] }))} />
}

// --------------------------------------------------------------------- widgets
type Widget = { id: string; kind: string; title?: string; desc?: string; source?: string; metric?: string; dimension?: string; type?: string; accent?: string }
const LS_KEY = "atr_overview_layout_v3"
const DEFAULT_WIDGETS: Widget[] = [
  { id: "engagement", kind: "engagement" },
  { id: "gsc", kind: "gsc" },
  { id: "ga4_users", kind: "custom", source: "ga4", metric: "activeUsers", dimension: "date", title: "GA · Active users", accent: C.amber },
  { id: "vendors_mix", kind: "vendors_mix" },
  { id: "leads_mix", kind: "leads_mix" },
  { id: "top_countries", kind: "top_countries" },
]
const LOCAL_METRICS: Record<string, { label: string; metrics: { key: string; label: string; color: string }[] }> = {
  engagement: { label: tt("Auto to Rental", "Auto to Rental"), metrics: [
    { key: "view", label: tt("Listing views", "مشاهدات"), color: C.blue },
    { key: "call", label: tt("Phone calls", "مكالمات"), color: C.emerald },
    { key: "whatsapp", label: "WhatsApp", color: "#22c55e" },
    { key: "webrtc", label: tt("Free calls", "مكالمات مجانية"), color: C.amber },
    { key: "follow", label: tt("Follows", "متابعات"), color: C.violet },
  ] },
  gsc: { label: tt("Google Search", "بحث جوجل"), metrics: [
    { key: "clicks", label: tt("Clicks", "نقرات"), color: C.blue },
    { key: "impressions", label: tt("Impressions", "ظهور"), color: C.violet },
  ] },
}

const OverviewPage = () => {
  const [days, setDays] = useState(30)
  const [ov, setOv] = useState<any>(null)
  const [ts, setTs] = useState<any[]>([])
  const [gsc, setGsc] = useState<any>(null)
  const [geo, setGeo] = useState<any[]>([])
  const [live, setLive] = useState<any>(null)
  const [ga4, setGa4] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [savedTick, setSavedTick] = useState(0)
  const firstSave = useRef(true)
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    try { const s = localStorage.getItem(LS_KEY); if (s) return JSON.parse(s) } catch {}
    return DEFAULT_WIDGETS
  })

  // Load server layout + GA4 metric catalogue once.
  useEffect(() => {
    fetch(`${API}/admin/settings/dashboard-layout`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && Array.isArray(d.layout) && d.layout.length) { firstSave.current = true; setWidgets(d.layout) } })
      .catch(() => {})
    fetch(`${API}/admin/analytics/ga4?metadata=1`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setGa4)
      .catch(() => {})
  }, [])

  // Persist layout: localStorage instantly, server debounced.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(widgets)) } catch {}
    if (firstSave.current) { firstSave.current = false; return }
    const t = setTimeout(() => {
      fetch(`${API}/admin/settings/dashboard-layout`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ layout: widgets }) })
        .then(() => setSavedTick((x) => x + 1)).catch(() => {})
    }, 900)
    return () => clearTimeout(t)
  }, [widgets])

  useEffect(() => {
    const to = new Date().toISOString()
    const from = new Date(Date.now() - days * 86400000).toISOString()
    const g = (u: string) => fetch(`${API}${u}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    g("/admin/overview").then(setOv)
    g(`/admin/analytics/timeseries?from=${from}&to=${to}`).then((d) => setTs(Array.isArray(d?.series) ? d.series : []))
    g(`/admin/search-console?days=${days}`).then(setGsc)
    g(`/admin/analytics/geography?days=${days}`).then((d) => setGeo(Array.isArray(d?.countries) ? d.countries : []))
  }, [days])
  useEffect(() => {
    const loadLive = () => fetch(`${API}/admin/analytics/live`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).then(setLive).catch(() => {})
    loadLive(); const iv = setInterval(loadLive, 10000); return () => clearInterval(iv)
  }, [])

  const tsLabels = useMemo(() => ts.map((r) => (r.date || "").slice(5)), [ts])
  const gscLabels = useMemo(() => (gsc?.by_date || []).map((r: any) => (r.date || "").slice(5)), [gsc])
  const sumTs = (k: string) => ts.reduce((a, r) => a + Number(r[k] || 0), 0)
  const enrich = (m: any) => { const f = ga4Friendly(m.name, m.label); return { key: m.name, label: f.label, desc: f.desc || m.description || "", raw: m.label } }
  const ga4Metrics = ((ga4 && Array.isArray(ga4.metrics) && ga4.metrics.length) ? ga4.metrics : GA4_FALLBACK_METRICS).map(enrich)
  const ga4Dims = ((ga4 && Array.isArray(ga4.dimensions) && ga4.dimensions.length) ? ga4.dimensions : GA4_FALLBACK_DIMS).map(enrich)

  const activeNow = Number(live?.active_now ?? live?.online ?? 0)
  const mrr = Number(ov?.est_mrr_aed || 0)

  const reorderTo = (src: string, dest: string) => setWidgets((ws) => {
    const a = [...ws]; const si = a.findIndex((w) => w.id === src); const di = a.findIndex((w) => w.id === dest)
    if (si < 0 || di < 0 || si === di) return ws
    const [m] = a.splice(si, 1); a.splice(di, 0, m); return a
  })
  const move = (id: string, dir: -1 | 1) => setWidgets((ws) => {
    const i = ws.findIndex((w) => w.id === id); const j = i + dir
    if (i < 0 || j < 0 || j >= ws.length) return ws
    const c = [...ws];[c[i], c[j]] = [c[j], c[i]]; return c
  })

  const renderWidget = (w: Widget) => {
    const remove = editing ? () => setWidgets((ws) => ws.filter((x) => x.id !== w.id)) : undefined
    const drag = draggedId === w.id
    switch (w.kind) {
      case "engagement":
        return <Panel title={tt("Engagement over time", "التفاعل عبر الزمن")} subtitle={tt(`Views, calls & messages · by Auto to Rental`, `مشاهدات ومكالمات ورسائل · من Auto to Rental`)} accent={C.blue} onRemove={remove} dragging={drag}>
          <AreaChart labels={tsLabels} series={[
            { name: tt("Views", "مشاهدات"), color: C.blue, data: ts.map((r) => Number(r.view || 0)) },
            { name: tt("Calls", "مكالمات"), color: C.emerald, data: ts.map((r) => Number(r.call || 0)) },
            { name: "WhatsApp", color: "#22c55e", data: ts.map((r) => Number(r.whatsapp || 0)) },
          ]} />
        </Panel>
      case "gsc":
        return <Panel title={tt("Google Search traffic", "زيارات بحث جوجل")} subtitle={gsc?.totals ? tt(`${fmt(gsc.totals.clicks)} clicks · ${fmt(gsc.totals.impressions)} impressions`, `${fmt(gsc.totals.clicks)} نقرة · ${fmt(gsc.totals.impressions)} ظهور`) : "Search Console"} accent={C.violet} onRemove={remove} dragging={drag}>
          {gsc?.by_date?.length ? (
            <AreaChart labels={gscLabels} series={[
              { name: tt("Clicks", "نقرات"), color: C.blue, data: gsc.by_date.map((r: any) => Number(r.clicks || 0)) },
              { name: tt("Impressions", "ظهور"), color: C.violet, data: gsc.by_date.map((r: any) => Number(r.impressions || 0)) },
            ]} />
          ) : (
            <div className="text-ui-fg-muted" style={{ fontSize: 13, padding: "18px 4px" }}>
              {tt("Connect Google Search Console to see clicks & impressions.", "اربط Google Search Console لعرض النقرات والظهور.")}
              <div style={{ marginTop: 10 }}><Link to="/search-console"><Button size="small" variant="secondary">{tt("Open Search Console", "فتح Search Console")} <ArrowUpRightOnBox /></Button></Link></div>
            </div>
          )}
        </Panel>
      case "vendors_mix":
        return <Panel title={tt("Vendors", "البائعون")} subtitle={tt("Paying vs trial", "مدفوع مقابل تجريبي")} accent={C.emerald} onRemove={remove} dragging={drag}>
          <Donut segments={[
            { label: tt("Paying", "مدفوع"), value: Number(ov?.paying_vendors || 0), color: C.emerald },
            { label: tt("Trial", "تجريبي"), value: Number(ov?.trial_vendors || 0), color: C.amber },
          ]} />
        </Panel>
      case "leads_mix":
        return <Panel title={tt("Leads mix", "توزيع العملاء")} subtitle={tt(`Last ${days}d`, `آخر ${days} يوم`)} accent={C.pink} onRemove={remove} dragging={drag}>
          <Donut segments={[
            { label: tt("Phone", "هاتف"), value: sumTs("call"), color: C.emerald },
            { label: "WhatsApp", value: sumTs("whatsapp"), color: "#22c55e" },
            { label: tt("Free calls", "مجانية"), value: sumTs("webrtc"), color: C.amber },
          ]} />
        </Panel>
      case "top_countries":
        return <Panel title={tt("Top countries", "أعلى الدول")} subtitle={tt(`Visitors · last ${days}d`, `زوّار · آخر ${days} يوم`)} accent={C.cyan} onRemove={remove} dragging={drag}>
          <BarList items={geo.slice(0, 7).map((c: any, i: number) => ({ label: c.name || c.code, value: Number(c.count || 0), color: PAL[i % PAL.length] }))} />
        </Panel>
      case "custom": {
        if (w.source === "ga4") {
          const f = ga4Friendly(w.metric || "activeUsers")
          const dimF = ga4Friendly(w.dimension || "date")
          const label = f.label
          const sub = [f.desc, w.dimension && w.dimension !== "date" ? tt(`by ${dimF.label}`, `حسب ${dimF.label}`) : "", tt("via Google Analytics", "عبر Google Analytics")].filter(Boolean).join(" · ")
          return <Panel title={label} subtitle={sub} accent={w.accent || C.amber} onRemove={remove} dragging={drag}>
            <Ga4Chart metric={w.metric || "activeUsers"} dimension={w.dimension || "date"} days={days} label={label} color={w.accent || C.amber} />
          </Panel>
        }
        const src = LOCAL_METRICS[w.source || "engagement"]
        const m = (src && src.metrics.find((x) => x.key === w.metric)) || (src && src.metrics[0])
        const data = w.source === "gsc" ? (gsc?.by_date || []).map((r: any) => Number(r[w.metric || "clicks"] || 0)) : ts.map((r) => Number(r[w.metric || "view"] || 0))
        const labels = w.source === "gsc" ? gscLabels : tsLabels
        return <Panel title={w.title || `${src?.label} · ${m?.label}`} subtitle={w.source === "gsc" ? tt("by Google Search", "من Google Search") : tt("by Auto to Rental", "من Auto to Rental")} accent={w.accent || C.cyan} onRemove={remove} dragging={drag}>
          {w.type === "bar"
            ? <BarList items={labels.map((l: string, i: number) => ({ label: l, value: data[i] || 0, color: m?.color })).slice(-12)} />
            : <AreaChart labels={labels} series={[{ name: m?.label || "", color: m?.color || C.blue, data }]} />}
        </Panel>
      }
      default: return null
    }
  }

  return (
    <SingleColumnPage>
      {/* Header */}
      <Container className="p-6">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em" }}>🛰️ {tt("Command Center", "مركز القيادة")}</h1>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#ef4444", color: "#fff", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 800 }}>
                <span style={{ width: 7, height: 7, borderRadius: 9, background: "#fff", animation: "atrpulse 1.1s infinite" }} /> {activeNow} {tt("online now", "متصل الآن")}
              </span>
              <style>{"@keyframes atrpulse{0%,100%{opacity:1}50%{opacity:.25}}"}</style>
            </div>
            <p className="text-ui-fg-subtle" style={{ fontSize: 13, marginTop: 4 }}>{tt("Your whole platform at a glance — live, auto-updating.", "منصّتك كاملة بلمحة — حيّة وتتحدّث تلقائياً.")}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {editing && savedTick > 0 && <span className="text-ui-fg-muted" style={{ fontSize: 12 }}>{tt("Saved ✓", "حُفظ ✓")}</span>}
            <div style={{ display: "inline-flex", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(120,120,140,.25)" }}>
              {[7, 30, 90].map((d) => (
                <button key={d} onClick={() => setDays(d)} style={{ padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none", background: days === d ? C.blue : "transparent", color: days === d ? "#fff" : "inherit" }}>{d}{tt("d", "ي")}</button>
              ))}
            </div>
            <Button variant={editing ? "primary" : "secondary"} onClick={() => setEditing((e) => !e)}>
              <PencilSquare /> {editing ? tt("Done", "تم") : tt("Customize", "تخصيص")}
            </Button>
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginTop: 18 }}>
          <StatCard icon={<Buildings />} label={tt("Companies", "الشركات")} value={fmt(Number(ov?.companies || 0))} accent={C.blue} footer={tt(`${ov?.paying_vendors || 0} paying`, `${ov?.paying_vendors || 0} مدفوع`)} />
          <StatCard icon={<HandTruck />} label={tt("Vehicles", "المركبات")} value={fmt(Number(ov?.vehicles || 0))} accent={C.violet} footer={tt(`${ov?.pending_approvals || 0} pending`, `${ov?.pending_approvals || 0} بانتظار`)} />
          <StatCard icon={<CurrencyDollar />} label={tt("Est. MRR", "الإيراد الشهري")} value={aed(mrr)} accent={C.emerald} footer={tt("from active plans", "من الاشتراكات النشطة")} />
          <StatCard icon={<Clock />} label={tt("Trials", "تجريبي")} value={fmt(Number(ov?.trial_vendors || 0))} accent={C.amber} footer={tt("on free trial", "بالتجربة المجانية")} />
          <StatCard icon={<CheckCircleSolid />} label={tt("Approvals", "موافقات")} value={fmt(Number(ov?.pending_approvals || 0))} accent={C.pink} footer={tt("awaiting review", "بانتظار المراجعة")} />
        </div>
      </Container>

      {/* Customize panel */}
      {editing && (
        <Container className="p-6 pt-0">
          <div style={{ borderRadius: 14, border: `1px dashed ${C.blue}66`, background: `${C.blue}0d`, padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{tt("Customize your dashboard", "خصّص لوحتك")}</div>
            <div className="text-ui-fg-subtle" style={{ fontSize: 12, marginBottom: 12 }}>✋ {tt("Drag cards to reorder, or use the arrows. Hide, or add any chart. Saved to your account automatically.", "اسحب البطاقات لإعادة الترتيب أو استخدم الأسهم. أخفِ أو أضف أي مخطط. يُحفظ في حسابك تلقائياً.")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              {widgets.map((w, i) => (
                <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 9, padding: "7px 10px", border: "1px solid rgba(120,120,140,.16)" }} className="bg-ui-bg-base">
                  <ChartBar />
                  <span style={{ flex: 1, fontSize: 13 }}>{w.title || w.kind}</span>
                  <button onClick={() => move(w.id, -1)} disabled={i === 0} style={{ cursor: "pointer", opacity: i === 0 ? 0.3 : 0.7, background: "none", border: "none", fontSize: 16 }}>↑</button>
                  <button onClick={() => move(w.id, 1)} disabled={i === widgets.length - 1} style={{ cursor: "pointer", opacity: i === widgets.length - 1 ? 0.3 : 0.7, background: "none", border: "none", fontSize: 16 }}>↓</button>
                  <button onClick={() => setWidgets((ws) => ws.filter((x) => x.id !== w.id))} style={{ cursor: "pointer", opacity: 0.6, background: "none", border: "none" }}><Trash /></button>
                </div>
              ))}
            </div>
            <AddChart onAdd={(w) => setWidgets((ws) => [...ws, w])} ga4Metrics={ga4Metrics} ga4Dims={ga4Dims} ga4Connected={!!(ga4 && ga4.connected)} />
            <div style={{ marginTop: 12 }}>
              <Button size="small" variant="secondary" onClick={() => setWidgets(DEFAULT_WIDGETS)}>{tt("Reset to default", "إعادة الافتراضي")}</Button>
            </div>
          </div>
        </Container>
      )}

      {/* Widget grid (drag to reorder in edit mode) */}
      <Container className="p-6 pt-0">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, alignItems: "stretch" }}>
          {widgets.map((w) => (
            <div
              key={w.id}
              draggable={editing}
              onDragStart={() => setDraggedId(w.id)}
              onDragEnd={() => setDraggedId(null)}
              onDragOver={(e) => { if (editing && draggedId && draggedId !== w.id) e.preventDefault() }}
              onDrop={(e) => { e.preventDefault(); if (draggedId && draggedId !== w.id) reorderTo(draggedId, w.id); setDraggedId(null) }}
              style={{ height: "100%", opacity: draggedId === w.id ? 0.4 : 1, cursor: editing ? "grab" : "default", transition: "opacity .15s" }}
            >
              {renderWidget(w)}
            </div>
          ))}
        </div>
      </Container>

      {/* Manage the platform */}
      <Container className="p-6 pt-0">
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>⚡ {tt("Manage the platform", "إدارة المنصّة")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16 }}>
          {[
            { to: "/rental-companies", label: tt("Rental Companies", "شركات التأجير"), icon: <Buildings />, c: C.blue },
            { to: "/pending-approvals", label: tt("Pending Approvals", "الموافقات المعلّقة"), icon: <CheckCircleSolid />, c: C.pink },
            { to: "/finance", label: tt("Finance", "المالية"), icon: <CurrencyDollar />, c: C.emerald },
            { to: "/analytics", label: tt("Analytics", "التحليلات"), icon: <ChartBar />, c: C.violet },
            { to: "/search-console", label: tt("Search Console", "Search Console"), icon: <MagnifyingGlass />, c: C.blue },
            { to: "/ad-campaigns", label: tt("Ads Manager", "إدارة الإعلانات"), icon: <Bolt />, c: C.amber },
            { to: "/live-traffic", label: tt("Live Traffic", "الزيارات الحيّة"), icon: <Eye />, c: C.cyan },
            { to: "/marketing", label: tt("Marketing", "التسويق"), icon: <Users />, c: C.pink },
          ].map((q) => (
            <Link key={q.to} to={q.to} style={{ textDecoration: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", borderRadius: 12, border: "1px solid rgba(120,120,140,.16)", color: "inherit" }} className="bg-ui-bg-base">
                <span style={{ display: "inline-flex", width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center", background: `${q.c}1f`, color: q.c }}>{q.icon}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{q.label}</span>
                <span style={{ marginLeft: "auto", opacity: 0.4 }}><ArrowUpRightOnBox /></span>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </SingleColumnPage>
  )
}

// "Add any chart" builder — local metrics + Google Search + Google Analytics (all GA4 metrics)
function AddChart({ onAdd, ga4Metrics, ga4Dims, ga4Connected }: { onAdd: (w: Widget) => void; ga4Metrics: { key: string; label: string; desc?: string }[]; ga4Dims: { key: string; label: string; desc?: string }[]; ga4Connected: boolean }) {
  const [source, setSource] = useState("engagement")
  const [metric, setMetric] = useState("view")
  const [dim, setDim] = useState("date")
  const [type, setType] = useState("area")
  const isGa4 = source === "ga4"
  const localMs = LOCAL_METRICS[source]?.metrics || []
  const sel = { padding: "7px 9px", borderRadius: 8, border: "1px solid rgba(120,120,140,.3)", fontSize: 13 } as const
  const onSource = (v: string) => {
    setSource(v)
    if (v === "ga4") setMetric(ga4Metrics[0]?.key || "activeUsers")
    else setMetric(LOCAL_METRICS[v]?.metrics[0]?.key || "")
  }
  const add = () => {
    if (isGa4) onAdd({ id: `c${Math.round(performance.now())}`, kind: "custom", source: "ga4", metric, dimension: dim, accent: C.amber })
    else onAdd({ id: `c${Math.round(performance.now())}`, kind: "custom", source, metric, type })
  }
  // Live "what it shows" hint for the currently picked metric (+ dimension for GA4).
  const metricList: { key: string; label: string; desc?: string }[] = isGa4 ? ga4Metrics : localMs.map((m) => ({ key: m.key, label: m.label }))
  const curM = metricList.find((m) => m.key === metric)
  const curD = isGa4 && dim !== "date" ? ga4Dims.find((d) => d.key === dim) : undefined
  const hint = [curM?.desc, curD?.desc ? tt(`broken down by ${curD.label}`, `موزّعاً حسب ${curD.label}`) : ""].filter(Boolean).join(" · ")
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select className="bg-ui-bg-field" style={sel} value={source} onChange={(e) => onSource(e.target.value)}>
          <option value="engagement">{tt("Auto to Rental analytics", "تحليلات Auto to Rental")}</option>
          <option value="gsc">{tt("Google Search", "بحث جوجل")}</option>
          <option value="ga4">{tt("Google Analytics", "Google Analytics")}{ga4Connected ? "" : " •"}</option>
        </select>
        <select className="bg-ui-bg-field" style={sel} value={metric} onChange={(e) => setMetric(e.target.value)}>
          {metricList.map((m) => <option key={m.key} value={m.key} title={m.desc || ""}>{m.label}</option>)}
        </select>
        {isGa4 ? (
          <select className="bg-ui-bg-field" style={sel} value={dim} onChange={(e) => setDim(e.target.value)}>
            {ga4Dims.map((d) => <option key={d.key} value={d.key} title={d.desc || ""}>{d.label}</option>)}
          </select>
        ) : (
          <select className="bg-ui-bg-field" style={sel} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="area">{tt("Area / line", "منطقة / خط")}</option>
            <option value="bar">{tt("Bars", "أعمدة")}</option>
          </select>
        )}
        <Button size="small" onClick={add}><Plus /> {tt("Add chart", "أضف مخطط")}</Button>
      </div>
      {hint && <div className="text-ui-fg-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>💡 {hint}</div>}
    </div>
  )
}

export default OverviewPage
